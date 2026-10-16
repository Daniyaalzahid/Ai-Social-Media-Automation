import { MediaError } from './storage.ts';
/** One RFC byte range only. No multipart, unbounded numbers or empty ranges. */
export function mediaRange(value:string|null,size:number){
 if(value===null)return null;
 if(value.length>80||!Number.isSafeInteger(size)||size<1)throw new MediaError(416,'Requested media range is not available.');
 const match=/^bytes=(\d*)-(\d*)$/.exec(value);if(!match||!match[1]&&!match[2])throw new MediaError(416,'Requested media range is not available.');
 const first=match[1]?Number(match[1]):null,last=match[2]?Number(match[2]):null;
 if(first!==null&&!Number.isSafeInteger(first)||last!==null&&!Number.isSafeInteger(last))throw new MediaError(416,'Requested media range is not available.');
 const start=first??Math.max(0,size-(last??0)),end=first===null?size-1:Math.min(size-1,last??size-1);
 if(start<0||start>=size||end<start||first===null&&last===0)throw new MediaError(416,'Requested media range is not available.');return{start,end};
}
