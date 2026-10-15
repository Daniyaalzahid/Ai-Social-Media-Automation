import 'server-only';
import { getDatabase } from '../db/client';
import { NetworkIdentity, loadSecurityEventKey } from '../security/identity';
import { createTeamService } from './service';
export function teamService() { return createTeamService(getDatabase(), loadSecurityEventKey(process.env), NetworkIdentity.fromSocketAddress('::')); }
