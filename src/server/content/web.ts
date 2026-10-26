import 'server-only';
import { getDatabase } from '../db/client';
import type { MediaStorage } from '../media/storage';
import { configuredMediaStorage,mediaConfigured } from '../media/configured-storage';
import { createContentService } from './service';
export function contentService(){
 // Text-only Composer must work without media storage configuration.
 let storage:MediaStorage|undefined;
 if(mediaConfigured(process.env))storage=configuredMediaStorage(process.env);
 return createContentService(getDatabase(),storage);
}
