import type { EnvironmentSource } from '../config/schema.ts';
import { EnvironmentValidationError } from '../config/schema.ts';
import { LocalPrivateMediaStorage, storageRoot, type MediaStorage } from './storage.ts';
import { PrivateObjectMediaStorage } from './object-storage.ts';
export function mediaConfigured(source:EnvironmentSource) {return Boolean(source.MEDIA_STORAGE_BACKEND || source.MEDIA_STORAGE_ROOT || source.DEV_MEDIA_STORAGE_ROOT || source.TEST_MEDIA_STORAGE_ROOT);}
export function configuredMediaStorage(source:EnvironmentSource):MediaStorage {
  const mode=source.APP_ENV??source.NODE_ENV??'development',backend=source.MEDIA_STORAGE_BACKEND??'local';
  if (!['development','test','production'].includes(mode) || source.NODE_ENV && source.NODE_ENV!==mode) throw new EnvironmentValidationError(['media environment']);
  if (backend==='s3') {
    if(mode!=='production' || source.APP_ENV!=='production' || source.NODE_ENV!=='production' || source.MEDIA_STORAGE_ROOT || source.DEV_MEDIA_STORAGE_ROOT || source.TEST_MEDIA_STORAGE_ROOT) throw new EnvironmentValidationError(['private object storage production isolation']);
    return new PrivateObjectMediaStorage(source);
  }
  if(backend!=='local')throw new EnvironmentValidationError(['MEDIA_STORAGE_BACKEND']);
  return new LocalPrivateMediaStorage(storageRoot(source));
}
