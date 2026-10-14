#!/usr/bin/env python3
"""Temporary, rootless Linux x64 MySQL for development/CI. Never contacts production."""
import hashlib
import json
import os
import pathlib
import secrets
import subprocess
import sys
import time
import urllib.request

os.umask(0o077)
checkout = pathlib.Path(__file__).resolve().parent.parent
tools = pathlib.Path('/workspace/.tools') if os.access('/workspace', os.W_OK) else pathlib.Path(os.environ['RUNNER_TEMP']) / 'bismillah-tools'
binary_root = tools / 'mysql-ubuntu'
state = tools / 'phase2a-mysql'
state.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, LD_LIBRARY_PATH=str(binary_root / 'usr/lib/x86_64-linux-gnu'))
server = binary_root / 'usr/sbin/mysqld'
client = binary_root / 'usr/bin/mysql'
configuration = state / 'private.json'
runtime_grants = {
    'users': 'SELECT, INSERT, UPDATE',
    'roles': 'SELECT', 'permissions': 'SELECT', 'role_permissions': 'SELECT',
    'user_roles': 'SELECT, INSERT, UPDATE, DELETE',
    'sessions': 'SELECT, INSERT, UPDATE',
    'auth_challenges': 'SELECT, INSERT, UPDATE, DELETE',
    'mfa_methods': 'SELECT, INSERT, UPDATE, DELETE',
    'mfa_recovery_codes': 'SELECT, INSERT, UPDATE, DELETE',
    'password_reset_tokens': 'SELECT, INSERT, UPDATE, DELETE',
    'invitations': 'SELECT, INSERT, UPDATE, DELETE',
    'installation_state': 'SELECT',
    'auth_rate_limits': 'SELECT, INSERT, UPDATE, DELETE',
    'audit_logs': 'SELECT, INSERT', 'security_events': 'SELECT, INSERT',
}

def execute_sql(statement):
    return subprocess.run([str(client), '--defaults-file=' + str(state / 'root.cnf'), '--batch', '--skip-column-names'],
                          input=statement, text=True, env=env, capture_output=True, check=True)

def launch(init=None):
    args = [str(server), '--no-defaults', '--basedir=' + str(binary_root / 'usr'), '--datadir=' + str(state / 'data'),
            '--bind-address=127.0.0.1', '--port=3308', '--socket=' + str(state / 'mysql.sock'), '--pid-file=' + str(state / 'mysql.pid'),
            '--log-error=' + str(state / 'server.log'), '--mysqlx=OFF', '--secure-file-priv=NULL', '--skip-name-resolve']
    if init is not None:
        args.append('--init-file=' + str(init))
    with (state / 'process.log').open('a') as log:
        subprocess.Popen(args, env=env, stdout=log, stderr=log, start_new_session=True)
    for _ in range(100):
        try:
            execute_sql('SELECT 1;')
            return
        except (subprocess.CalledProcessError, FileNotFoundError):
            time.sleep(0.1)
    raise RuntimeError('Local MySQL failed readiness check; inspect private server logs')

def start():
    artifacts = json.loads((checkout / 'scripts/local-mysql-artifacts.json').read_text())
    stamp = binary_root / 'verified-artifacts.json'
    if not stamp.exists() or json.loads(stamp.read_text()) != artifacts:
        binary_root.mkdir(parents=True, exist_ok=True)
        for artifact in artifacts:
            payload = urllib.request.urlopen(artifact['url'], timeout=60).read()
            if hashlib.sha256(payload).hexdigest() != artifact['sha256']:
                raise RuntimeError('MySQL package checksum mismatch')
            deb = state / (artifact['package'] + '.deb')
            deb.write_bytes(payload)
            subprocess.run(['dpkg-deb', '-x', str(deb), str(binary_root)], check=True)
            deb.unlink()
        stamp.write_text(json.dumps(artifacts))
    if configuration.exists():
        try:
            execute_sql('SELECT 1;')
        except subprocess.CalledProcessError:
            launch()
        print('Existing isolated MySQL verified; credentials were not printed.')
        return
    data = state / 'data'
    if data.exists():
        raise RuntimeError('Unrecognized local MySQL state; preserve it and inspect before retrying')
    data.mkdir()
    subprocess.run([str(server), '--no-defaults', '--initialize-insecure', '--basedir=' + str(binary_root / 'usr'),
                    '--datadir=' + str(data), '--log-error=' + str(state / 'initialize.log')], env=env, check=True)
    root_password = secrets.token_hex(32)
    users = {name: secrets.token_hex(24) for name in ['bsa_dev_runtime', 'bsa_dev_migration', 'bsa_test_runtime', 'bsa_test_migration']}
    databases = ['bsa_dev_phase2a', 'bsa_test_phase2a', 'bsa_test_clean', 'bsa_test_recovery']
    statements = [f"ALTER USER 'root'@'localhost' IDENTIFIED BY '{root_password}';"]
    statements += [f'CREATE DATABASE {name} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;' for name in databases]
    for name, password in users.items():
        statements.append(f"CREATE USER '{name}'@'127.0.0.1' IDENTIFIED BY '{password}';")
        if name.endswith('_migration'):
            scopes = [d for d in databases if d.startswith('bsa_test_' if '_test_' in name else 'bsa_dev_')]
            for database in scopes:
                scope = database.replace('_', r'\_')
                statements.append(f"GRANT ALL PRIVILEGES ON `{scope}`.* TO '{name}'@'127.0.0.1';")
    init = state / 'init.sql'
    init.write_text('\n'.join(statements))
    socket = state / 'mysql.sock'
    (state / 'root.cnf').write_text(f'[client]\nuser=root\npassword={root_password}\nsocket={socket}\n')
    launch(init)
    init.unlink()
    for mode, prefix in [('development', 'dev'), ('test', 'test')]:
        text = f'NODE_ENV={mode}\nAPP_ENV={mode}\n'
        for key, suffix in [(prefix.upper() + '_DATABASE_URL', 'runtime'), (prefix.upper() + '_DATABASE_MIGRATION_URL', 'migration')]:
            name = f'bsa_{prefix}_{suffix}'
            text += f'{key}=mysql://{name}:{users[name]}@127.0.0.1:3308/bsa_{prefix}_phase2a\n'
        if mode == 'test':
            text += 'TEST_DATABASE_RESET_ALLOWED=1\n'
        (state / (mode + '.env')).write_text(text)
    configuration.write_text(json.dumps({'port': 3308, 'databases': databases}))
    print('Isolated MySQL ready on loopback. Private environment files remain outside the checkout.')

def grant_runtime():
    # Migration identity alone provisions schema. Runtime gets no DDL, installation
    # writes, audit UPDATE/DELETE, or cross-environment privileges.
    databases = json.loads(configuration.read_text())['databases']
    for prefix in ['dev', 'test']:
        migration_user = f'bsa_{prefix}_migration'
        grants = [f"REVOKE ALL PRIVILEGES, GRANT OPTION FROM '{migration_user}'@'127.0.0.1';"]
        for database in databases:
            if database.startswith(f'bsa_{prefix}_'):
                scope = database.replace('_', r'\_')
                grants.append(f"GRANT ALL PRIVILEGES ON `{scope}`.* TO '{migration_user}'@'127.0.0.1';")
        execute_sql('\n'.join(grants))
        database = f'bsa_{prefix}_phase2a'
        user = f'bsa_{prefix}_runtime'
        tables = execute_sql(f'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA="{database}";').stdout.splitlines()
        if not set(runtime_grants).issubset(tables):
            raise RuntimeError('Run isolated migrations before granting runtime access')
        # Reconcile old grants too: additive GRANT alone leaves previous excessive
        # privileges intact. Unknown tables receive no automatic runtime permissions.
        statements = [f"REVOKE ALL PRIVILEGES, GRANT OPTION FROM '{user}'@'127.0.0.1';"]
        for table, privileges in runtime_grants.items():
            statements.append(f"GRANT {privileges} ON {database}.{table} TO '{user}'@'127.0.0.1';")
        execute_sql('\n'.join(statements))
    print('Isolated runtime grants applied; no server-wide privileges required.')

def stop():
    execute_sql('SHUTDOWN;')
    print('Temporary MySQL stopped; private data/configuration retained outside checkout.')

try:
    commands = {'start': start, 'grants': grant_runtime, 'stop': stop}
    commands[sys.argv[1]]()
except Exception:
    # subprocess errors can contain credential-bearing command output: never forward.
    print('Local MySQL setup failed. Inspect tool availability/private logs; no credentials printed.', file=sys.stderr)
    sys.exit(1)
