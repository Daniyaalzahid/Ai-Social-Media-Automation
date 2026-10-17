// @vitest-environment jsdom
import { render,screen,cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it,expect,afterEach } from 'vitest';
import { Connections } from '../../src/features/connections/connections';
import type { ConnectionsView } from '../../src/features/connections/model';
afterEach(cleanup);
const view:ConnectionsView={canManage:false,management:[],setup:[],destinations:[{id:'safe-id',provider:'TIKTOK',type:'TIKTOK_ACCOUNT',displayName:'<script>بسم اللہ</script>',handle:'safe-handle',status:'LIMITED',publishing:'UNVERIFIED'}]};
it('safe Creator view renders destination text and no management controls',()=>{const{container}=render(<Connections initial={view}/>);expect(screen.getByText(/بسم اللہ/)).toBeInTheDocument();expect(container.querySelector('script')).toBeNull();expect(screen.queryByRole('button')).toBeNull();expect(screen.queryByLabelText('Password')).toBeNull();});
it('missing reviewed providers display setup state without initiating OAuth',()=>{render(<Connections initial={{...view,canManage:true,destinations:[],setup:['META','TIKTOK','YOUTUBE','LINKEDIN']}}/>);expect(screen.getAllByText('Provider setup required')).toHaveLength(4);expect(screen.queryByRole('button')).toBeNull();});
it('sensitive destination actions require explicit confirmation and clear transient fields on cancel',async()=>{const user=userEvent.setup();render(<Connections initial={{...view,canManage:true,management:[{id:'authorization',provider:'TIKTOK',version:1,status:'CONNECTED',selectedId:null,destinations:view.destinations}]}}/>);await user.click(screen.getByRole('button',{name:'Disconnect TIKTOK'}));expect(screen.getByRole('heading',{name:'Confirm disconnect'})).toBeInTheDocument();await user.type(screen.getByLabelText('Password'),'synthetic test-only value');await user.click(screen.getByRole('button',{name:'Cancel'}));expect(screen.queryByLabelText('Password')).toBeNull();});
