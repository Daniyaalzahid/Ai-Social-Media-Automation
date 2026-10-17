import 'server-only';
import { getDatabase } from '../db/client';
import { createConnectionsService } from './service';
import { loadTokenKey } from './crypto';
import { productionProviders } from './provider';
import { browserConfiguration } from '../auth/browser-security';
export function connectionsService(){return createConnectionsService(getDatabase(),{origin:browserConfiguration(process.env).origin,key:()=>loadTokenKey(process.env),providers:productionProviders(),environment:process.env.NODE_ENV==='production'?'production':'development'});}
