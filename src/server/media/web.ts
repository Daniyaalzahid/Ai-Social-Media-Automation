import 'server-only';
import { getDatabase } from '../db/client';
import { createMediaService } from './service';
import { configuredMediaStorage } from './configured-storage';
export function mediaService(){return createMediaService(getDatabase(),configuredMediaStorage(process.env));}
