import { expect,it } from 'vitest';
import { availableChannels,canEditFailedSelection,composerPack,publicationSummary,publicationLabel } from '../../src/features/composer/model';
const channel={id:'synthetic',displayName:'Synthetic channel',platform:'FACEBOOK' as const,authorizationVersion:1};
it('Select All is limited to server-admitted channels and reviewed media capability',()=>{
 expect(availableChannels([],false)).toEqual([]);expect(availableChannels([channel],true)).toEqual([channel]);
 expect(availableChannels([{...channel,platform:'LINKEDIN'}],true)).toEqual([]);
 expect(availableChannels([{...channel,platform:'LINKEDIN'}],false)).toHaveLength(1);
});
it('inherits the master caption and applies explicit overrides without changing source input',()=>{
 const custom={INSTAGRAM:{caption:'Only Instagram',hashtags:[]}};
 expect(composerPack('My caption',['FACEBOOK','INSTAGRAM'],custom)).toEqual({FACEBOOK:{caption:'My caption',hashtags:[]},...custom});expect(custom.INSTAGRAM.caption).toBe('Only Instagram');
 const youtube=composerPack('A title\nA description',['YOUTUBE']).YOUTUBE!;expect(youtube.title).toBe('A title');expect(youtube.description).toBe('A title\nA description');
});
it.each([
 [[], 'Draft'],[['PUBLISHED'],'Published'],[['PUBLISHED','FAILED'],'Partially Published'],[['FAILED'],'Failed'],[['UNKNOWN'],'Unconfirmed'],[['ACCEPTED'],'Publishing'],
] as const)('never fabricates success for %s',(states,expected)=>{expect(publicationSummary(states.map(state=>({state})))).toBe(expected);});
it('unknown results explicitly prohibit resend',()=>expect(publicationLabel('UNKNOWN')).toContain('do not resend'));

it('does not offer a new send after a network-uncertain dispatch or an unknown outcome',()=>{
 expect(canEditFailedSelection([{command:{},status:null,message:'Not confirmed'}])).toBe(false);
 expect(canEditFailedSelection([{command:{},status:{state:'UNKNOWN'},message:''}])).toBe(false);
 expect(canEditFailedSelection([{command:{},status:{state:'PUBLISHED'},message:''}])).toBe(false);
 expect(canEditFailedSelection([{command:null,status:null,message:'Could not prepare'}])).toBe(true);
 expect(canEditFailedSelection([{command:{},status:{state:'FAILED'},message:''}])).toBe(true);
 expect(canEditFailedSelection([])).toBe(false);
});
