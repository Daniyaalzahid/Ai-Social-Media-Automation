import 'server-only';
import { getDatabase } from '../db/client';
import { LocalPrivateMediaStorage,storageRoot } from '../media/storage';
import { createPublishingService } from './service';
import { productionPublishingProviders } from './provider';
export function publishingService(){let storage:LocalPrivateMediaStorage|undefined;if(process.env.MEDIA_STORAGE_ROOT||process.env.DEV_MEDIA_STORAGE_ROOT||process.env.TEST_MEDIA_STORAGE_ROOT)storage=new LocalPrivateMediaStorage(storageRoot(process.env));return createPublishingService(getDatabase(),{environment:process.env.NODE_ENV==='production'?'production':'development',providers:productionPublishingProviders(),...(storage?{storage}:{})});}
