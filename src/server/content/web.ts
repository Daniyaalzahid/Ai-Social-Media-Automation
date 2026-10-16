import 'server-only';
import { getDatabase } from '../db/client';
import { LocalPrivateMediaStorage,storageRoot } from '../media/storage';
import { createContentService } from './service';
export function contentService(){
 // Text-only Composer must work without media storage configuration.
 let storage:LocalPrivateMediaStorage|undefined;
 if(process.env.MEDIA_STORAGE_ROOT||process.env.DEV_MEDIA_STORAGE_ROOT||process.env.TEST_MEDIA_STORAGE_ROOT)storage=new LocalPrivateMediaStorage(storageRoot(process.env));
 return createContentService(getDatabase(),storage);
}
