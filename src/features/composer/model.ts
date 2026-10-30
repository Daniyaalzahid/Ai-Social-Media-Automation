import type { SocialPack } from '../ai/model';
import type { PublishingPage,PublishStatus } from '../publishing/model';
import { PLATFORMS } from '../brand/model';
export type Platform=typeof PLATFORMS[number];
export const channelNames:Record<Platform,string>={FACEBOOK:'Facebook',INSTAGRAM:'Instagram',TIKTOK:'TikTok',LINKEDIN:'LinkedIn',YOUTUBE:'YouTube'};
export type Channel=PublishingPage['destinations'][number];
export function availableChannels(channels:Channel[],hasMedia:boolean){return channels.filter(c=>!hasMedia||c.platform!=='LINKEDIN');} // The reviewed LinkedIn adapter supports text only.
export function composerPack(caption:string,platforms:Platform[],overrides:SocialPack={}):SocialPack{
 return Object.fromEntries(platforms.map(p=>[p,overrides[p]??(p==='YOUTUBE'?{title:caption.split('\n')[0]!.slice(0,100),description:caption,hashtags:[],tags:[]}:{caption,hashtags:[]})]));
}
export function publicationLabel(state:PublishStatus['state']){return({CREATED:'Ready',DISPATCHING:'Publishing',ACCEPTED:'Accepted — awaiting confirmation',PROCESSING:'Processing',PUBLISHED:'Published',FAILED:'Failed',UNKNOWN:'Unconfirmed — do not resend'})[state];}
export function publicationSummary(statuses:Pick<PublishStatus,'state'>[]){if(!statuses.length)return 'Draft';if(statuses.every(s=>s.state==='PUBLISHED'))return 'Published';if(statuses.some(s=>s.state==='PUBLISHED'))return 'Partially Published';if(statuses.every(s=>s.state==='FAILED'))return 'Failed';if(statuses.some(s=>s.state==='UNKNOWN'))return 'Unconfirmed';return 'Publishing';}
/** UI recovery must never turn an uncertain dispatch into a new send. */
export function canEditFailedSelection(results:{command:unknown;status:Pick<PublishStatus,'state'>|null;message:string}[]){return results.length>0&&results.every(r=>r.status?.state==='FAILED'||!r.command&&!r.status&&!!r.message);}
