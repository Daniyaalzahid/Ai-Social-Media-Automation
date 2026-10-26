import { linkedinRuntime } from '../linkedin-runtime';
import 'server-only';
import { getDatabase } from '../db/client';
import type { MediaStorage } from '../media/storage';
import { configuredMediaStorage,mediaConfigured } from '../media/configured-storage';
import { createPublishingService } from './service';
import { productionPublishingProviders } from './provider';
export function publishingService(){const providers=new Map(productionPublishingProviders()),linkedin=linkedinRuntime();if(linkedin)providers.set('LINKEDIN',linkedin.publisher);let storage:MediaStorage|undefined;if(mediaConfigured(process.env))storage=configuredMediaStorage(process.env);return createPublishingService(getDatabase(),{environment:process.env.NODE_ENV==='production'?'production':'development',providers,...(storage?{storage}:{})});}
