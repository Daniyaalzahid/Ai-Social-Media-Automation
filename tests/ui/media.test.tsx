// @vitest-environment jsdom
import {render,screen,cleanup,fireEvent,waitFor}from'@testing-library/react';
import {afterEach,it,expect,vi}from'vitest';
import {TemporaryMedia}from'../../src/features/media/temporary-media';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('labels upload controls and communicates expiry/empty state accessibly',()=>{render(<TemporaryMedia initial={[]}/>);expect(screen.getByLabelText('Choose a temporary image or video')).toHaveAttribute('type','file');expect(screen.getByRole('heading',{name:'No temporary uploads'})).toBeInTheDocument();expect(screen.getByRole('status')).toHaveAttribute('aria-live','polite');});
it('renders permitted filenames as text with conditional removal controls',()=>{render(<TemporaryMedia initial={[{id:'00000000-0000-4000-8000-000000000001',name:'<script>.png',kind:'image',mime:'image/png',bytes:10,width:1,height:1,duration:null,status:'temporary',expiresAt:'2026-10-18T00:00:00Z',createdAt:'2026-10-17T00:00:00Z',canRemove:false}]}/>);expect(screen.getByRole('heading',{name:'<script>.png'})).toBeInTheDocument();expect(document.querySelector('script')).toBeNull();expect(screen.queryByRole('button',{name:'Remove file'})).toBeNull();});

it('uploads a browser-selected JPEG with an empty MIME hint using the existing secure request',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce({json:async()=>({csrf:'x'.repeat(43)})}).mockResolvedValueOnce({ok:true,json:async()=>({ok:true})}).mockResolvedValueOnce({json:async()=>({ok:true,media:[]})});
 vi.stubGlobal('fetch',fetch);render(<TemporaryMedia initial={[]}/>);
 const file=new File([new Uint8Array([255,216,255,217])],'normal.JPG',{type:''});
 fireEvent.change(screen.getByLabelText('Choose a temporary image or video'),{target:{files:[file]}});
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Upload ready.'));
 const options=fetch.mock.calls[1]![1] as RequestInit;
 expect(options.method).toBe('POST');expect(options.headers).toEqual({'Content-Type':'image/jpeg','X-CSRF-Token':'x'.repeat(43)});expect(options.body).toBe(file);
});
it('rejects unsupported browser media before any request',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);render(<TemporaryMedia initial={[]}/>);
 fireEvent.change(screen.getByLabelText('Choose a temporary image or video'),{target:{files:[new File(['<svg/>'],'unsupported.svg',{type:''})]}});
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Use a supported filename and media type.'));
 expect(fetch).not.toHaveBeenCalled();
});
