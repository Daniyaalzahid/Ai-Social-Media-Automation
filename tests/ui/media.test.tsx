// @vitest-environment jsdom
import {render,screen,cleanup}from'@testing-library/react';
import {afterEach,it,expect}from'vitest';
import {TemporaryMedia}from'../../src/features/media/temporary-media';
afterEach(cleanup);
it('labels upload controls and communicates expiry/empty state accessibly',()=>{render(<TemporaryMedia initial={[]}/>);expect(screen.getByLabelText('Choose a temporary image or video')).toHaveAttribute('type','file');expect(screen.getByRole('heading',{name:'No temporary uploads'})).toBeInTheDocument();expect(screen.getByRole('status')).toHaveAttribute('aria-live','polite');});
it('renders permitted filenames as text with conditional removal controls',()=>{render(<TemporaryMedia initial={[{id:'00000000-0000-4000-8000-000000000001',name:'<script>.png',kind:'image',mime:'image/png',bytes:10,width:1,height:1,duration:null,status:'temporary',expiresAt:'2026-10-18T00:00:00Z',createdAt:'2026-10-17T00:00:00Z',canRemove:false}]}/>);expect(screen.getByRole('heading',{name:'<script>.png'})).toBeInTheDocument();expect(document.querySelector('script')).toBeNull();expect(screen.queryByRole('button',{name:'Remove file'})).toBeNull();});
