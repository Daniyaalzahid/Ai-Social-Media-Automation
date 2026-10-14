"""Real PTY security probes; output boolean/count evidence only, never captured text."""
import json
import os
import pty
import select
import signal
import subprocess
import sys
import tempfile
import termios
import time

repo, node, mode = sys.argv[1:]
payload = json.load(sys.stdin) if mode == "cli_race" else {}
secret = payload.get("password", os.urandom(24).hex()).encode()

with tempfile.TemporaryDirectory(prefix="bsa-tty-review-") as directory:
    filename = os.path.join(directory, "input.mjs")
    module = json.dumps(os.path.join(repo, "src/server/auth/terminal.ts"))
    if mode != "cli_race":
        with open(filename, "w", encoding="utf8") as stream:
            stream.write("import {readProtectedLine} from " + module + ";\n")
            if mode == "error":
                stream.write("setTimeout(()=>process.stdin.emit('error',new Error('synthetic input failure')),200);\n")
            stream.write("try { const value=await readProtectedLine(process.stdin,process.stderr,'Password (hidden): ',true);")
            if mode == "hidden":
                stream.write("const repeated=await readProtectedLine(process.stdin,process.stderr,'Confirm password (hidden): ',true); console.log(JSON.stringify({ok:value===repeated}));")
            else:
                stream.write("console.log(JSON.stringify({unexpectedSuccess:true}));")
            stream.write("} catch { console.log(JSON.stringify({safeFailure:true})); }\n")
    children = []
    for index in range(2 if mode == "cli_race" else 1):
        master, slave = pty.openpty()
        original = termios.tcgetattr(slave)
        env = os.environ.copy()
        if mode == "cli_race":
            env.update({key: value for key, value in payload["source"].items() if isinstance(value, str)})
            # This value must be ignored; the actual password is provided through the TTY.
            env["BOOTSTRAP_PASSWORD"] = os.urandom(24).hex()
        command = [node, os.path.join(repo, "scripts/owner-bootstrap.mjs")] if mode == "cli_race" else [node, filename]
        if mode == "cli_args":
            command = [node, os.path.join(repo, "scripts/owner-bootstrap.mjs"), "--password=synthetic-only"]
        child = subprocess.Popen(command, stdin=slave, stdout=slave, stderr=slave, env=env, cwd=repo)
        children.append({"child": child, "master": master, "slave": slave, "original": original, "captured": b"", "stage": 0})
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        for item in children:
            ready, _, _ = select.select([item["master"]], [], [], 0.02)
            if ready:
                try:
                    item["captured"] += os.read(item["master"], 8192)
                except OSError:
                    pass
            captured, stage = item["captured"], item["stage"]
            if mode == "cli_race":
                prompts = [b"to continue: ", b"Owner email: ", b"Display name: ", b"Password (hidden): ", b"Confirm password (hidden): "]
                values = [b"BOOTSTRAP test bsa_test_recovery", ("pty-owner-%i@example.test" % children.index(item)).encode(), b"Synthetic PTY Owner", secret, secret]
                if stage < len(prompts) and prompts[stage] in captured:
                    os.write(item["master"], values[stage] + b"\r")
                    item["stage"] += 1
            elif stage == 0 and b"Password (hidden): " in captured:
                if mode == "ctrl_c":
                    os.write(item["master"], b"\x03")
                elif mode == "signal":
                    item["child"].send_signal(signal.SIGINT)
                elif mode == "invalid_utf8":
                    os.write(item["master"], b"\xff\r")
                else:
                    os.write(item["master"], secret + (b"\r" if mode == "hidden" else b""))
                item["stage"] = 1
            elif mode == "hidden" and stage == 1 and b"Confirm password (hidden): " in captured:
                os.write(item["master"], secret + b"\r")
                item["stage"] = 2
        if all(item["child"].poll() is not None for item in children):
            break
    restored, leaked, successes, failures, unexpected = True, False, 0, 0, False
    for item in children:
        if item["child"].poll() is None:
            item["child"].kill()
        code = item["child"].wait()
        # Drain any final data before assessing captured output.
        while select.select([item["master"]], [], [], 0)[0]:
            try:
                chunk = os.read(item["master"], 8192)
                if not chunk:
                    break
                item["captured"] += chunk
            except OSError:
                break
        current = termios.tcgetattr(item["slave"])
        restored &= current[3] == item["original"][3]
        leaked |= secret in item["captured"]
        if mode == "cli_args":
            leaked |= b"synthetic-only" in item["captured"]
        successes += int(code == 0 and (b'MFA_ENROLLMENT_REQUIRED' in item["captured"] if mode == "cli_race" else b'"ok":true' in item["captured"]))
        failures += int(b'"safeFailure":true' in item["captured"])
        if mode == "cli_args":
            failures += int(code == 1 and b"secure interactive terminal" in item["captured"])
        unexpected |= b'"unexpectedSuccess":true' in item["captured"]
        os.close(item["master"])
        os.close(item["slave"])
    print(json.dumps({"successes": successes, "safeFailures": failures, "restored": restored, "leaked": leaked, "unexpectedSuccess": unexpected}))
