// Only imported by the disposable browser fixture; never by application code.
import type { PublishingProvider } from '../../src/server/publishing/provider';
export function composerTestProviders(){
 const make=(platform:'FACEBOOK'|'INSTAGRAM'):PublishingProvider=>({mode:'test',provider:'META',platform,capabilityRef:'synthetic-composer/v1',requiredScopes:['synthetic.publish'],
  validate(intent){if(intent.assets.length>4)throw new Error('Synthetic media limit');},
  async publish(_intent,signal){signal.throwIfAborted();return platform==='INSTAGRAM'?{status:'FAILED',category:'REMOTE_REJECTED',code:'REJECTED'}:{status:'PUBLISHED',publicationId:'synthetic-composer-publication',processingId:null,publishedAt:new Date().toISOString()};},
  async status(){return{status:'UNKNOWN'};},
 });
 return new Map([['FACEBOOK',make('FACEBOOK')],['INSTAGRAM',make('INSTAGRAM')]] as const);
}
