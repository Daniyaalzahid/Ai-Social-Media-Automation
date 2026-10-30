// @vitest-environment jsdom
import { render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect,it,vi } from 'vitest';
import { SimpleComposer,type ComposerProps } from '../../src/features/composer/simple-composer';
import { CREATIVE } from '../../src/server/ai/policy';
const base:ComposerProps={channels:[],canPublish:true,canUpload:true,canConnect:true,aiAvailable:false,brandRevision:1,options:{starters:CREATIVE,facts:[],media:[]}};
it('keeps manual editing/media usable while unavailable channels, AI and scheduling remain truthful',async()=>{
 const user=userEvent.setup();render(<SimpleComposer {...base}/>);
 expect(screen.getAllByText('Not connected')).toHaveLength(5);expect(screen.getByRole('button',{name:'Select All'})).toBeDisabled();expect(screen.getByRole('button',{name:'Post Now'})).toBeDisabled();
 await user.type(screen.getByLabelText('Caption'),'My own caption');expect(screen.getByLabelText('Caption')).toHaveValue('My own caption');
 expect(screen.getByRole('button',{name:'Generate with AI'})).toBeDisabled();expect(screen.getByLabelText('Upload Media')).toHaveAttribute('type','file');
 await user.click(screen.getByRole('button',{name:'Schedule'}));expect(screen.getByRole('button',{name:'Schedule Post'})).toBeDisabled();expect(screen.getByText(/scheduler has no live dispatch backend/)).toBeInTheDocument();
});
it('selects only admitted connected channels and clears overrides on master edits',async()=>{
 const user=userEvent.setup();render(<SimpleComposer {...base} channels={[{id:'1',displayName:'Our Facebook',platform:'FACEBOOK',authorizationVersion:1},{id:'2',displayName:'Our Instagram',platform:'INSTAGRAM',authorizationVersion:1}]}/>);
 await user.click(screen.getByRole('button',{name:'Select All'}));for(const box of screen.getAllByRole('checkbox'))expect(box).toBeChecked();
 await user.type(screen.getByLabelText('Caption'),'A shared caption');expect(screen.getByRole('button',{name:'Post Now'})).not.toBeDisabled();
 await user.click(screen.getByText('Customize for each channel'));await user.clear(screen.getByLabelText('Instagram caption'));await user.type(screen.getByLabelText('Instagram caption'),'Custom');expect(screen.getByLabelText('Instagram caption')).toHaveValue('Custom');
 await user.type(screen.getByLabelText('Caption'),' edited');expect(screen.getByLabelText('Instagram caption')).toHaveValue('A shared caption edited');
});
it('reuses the upload API, shows authorized preview, replaces media and removes it from the post',async()=>{
 const user=userEvent.setup();let id=0;vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(JSON.stringify(url==='/api/auth'?{csrf:'x'.repeat(43)}:{ok:true,media:{id:`00000000-0000-4000-8000-${String(++id).padStart(12,'0')}`,name:id===1?'first.png':'second.png',kind:'image',mime:'image/png',bytes:100,width:1,height:1,duration:null,status:'temporary',expiresAt:'2026-11-01',createdAt:'2026-10-30',canRemove:true}}),{status:url==='/api/auth'?200:201})));
 try{render(<SimpleComposer {...base}/>);await user.upload(screen.getByLabelText('Upload Media'),new File(['synthetic'],'first.png',{type:'image/png'}));await waitFor(()=>expect(screen.getByAltText('first.png')).toHaveAttribute('src','/api/media/00000000-0000-4000-8000-000000000001/binary'));
 await user.upload(screen.getByLabelText('Upload Media'),new File(['synthetic'],'second.png',{type:'image/png'}));await waitFor(()=>expect(screen.getByAltText('second.png')).toBeInTheDocument());expect(screen.queryByAltText('first.png')).not.toBeInTheDocument();await user.click(screen.getByRole('button',{name:'Remove from post'}));expect(screen.queryByAltText('second.png')).not.toBeInTheDocument();
 }finally{vi.unstubAllGlobals();}
});
