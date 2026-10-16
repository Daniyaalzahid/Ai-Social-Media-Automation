import 'server-only';
import { getDatabase } from '../db/client';
import { createMediaService } from './service';
import { LocalPrivateMediaStorage,storageRoot } from './storage';
export function mediaService(){return createMediaService(getDatabase(),new LocalPrivateMediaStorage(storageRoot(process.env)));}
