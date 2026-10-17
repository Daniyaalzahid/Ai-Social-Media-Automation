'use client';
import { useState,useEffect,useRef } from 'react';
import type { ConnectionsView,IntegrationMutation } from './model';
import { PROVIDERS } from './model';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { buttonClass } from '../../components/ui/button';
export function Connections({initial}:{initial:ConnectionsView}){
 const[view,setView]=useState(initial),[pending,setPending]=useState<IntegrationMutation|null>(null),[password,setPassword]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const passwordInput=useRef<HTMLInputElement>(null),trigger=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(pending)passwordInput.current?.focus();else trigger.current?.focus();},[pending]);
 function ask(value:IntegrationMutation){trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setPending(value);}
 async function perform(event:React.FormEvent){event.preventDefault();if(!pending||busy)return;setBusy(true);setMessage('');const submitted=password;setPassword('');const submittedCode=code;setCode('');
  try{const csrf=async()=>{const r=await fetch('/api/auth',{cache:'no-store'}),data=await r.json();if(!r.ok||typeof data.csrf!=='string')throw new Error();return data.csrf as string;};
   const post=async(data:unknown)=>{const r=await fetch('/api/connections',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':await csrf()},body:JSON.stringify(data)});const v=await r.json();if(!r.ok||!v.ok)throw new Error();return v;};
   const step=await post({operation:'step-up',mutation:pending,password:submitted,code:submittedCode}),result=await post({operation:'mutate',mutation:pending,proof:step.proof});
   if(result.redirect){window.location.assign(result.redirect);return;}const r=await fetch('/api/connections',{cache:'no-store'}),data=await r.json();if(!r.ok||!data.ok)throw new Error();setView(data.view);setPending(null);setMessage('Connection updated.');
  }catch{setMessage('Unable to complete this connection request. Restart and try again.');}finally{setBusy(false);}
 }
 return <div style={{overflowWrap:'anywhere'}}><p>External authorization only. Connecting a channel does not publish content or verify publishing readiness.</p><p role="status" aria-live="polite">{message}</p>
 {PROVIDERS.map(provider=><Card key={provider}><h2>{provider==='META'?'Facebook / Instagram':provider==='YOUTUBE'?'YouTube':provider==='TIKTOK'?'TikTok':'LinkedIn'}</h2>
 {view.setup.includes(provider)&&<p><Badge>Provider setup required</Badge> Current official protocol and app configuration must be verified before connection.</p>}
 {view.destinations.filter(d=>d.provider===provider).map(d=><p key={d.id}>{d.displayName} {d.handle??''} · {d.status.toLowerCase().replaceAll('_',' ')} · Publishing unverified</p>)}
 {!view.destinations.some(d=>d.provider===provider)&&<p>No authorized destination selected.</p>}
 {view.canManage&&!view.setup.includes(provider)&&<button className={buttonClass('secondary')} disabled={busy} onClick={()=>ask({action:'connect',provider})}>Connect {provider}</button>}
 {view.canManage&&view.management.filter(a=>a.provider===provider).map(a=><div key={a.id}><p>{a.status.toLowerCase().replaceAll('_',' ')}</p>
 {!view.setup.includes(provider)&&<button className={buttonClass('secondary')} disabled={busy} onClick={()=>ask({action:'reconnect',provider,authorizationId:a.id,version:a.version})}>Reconnect {provider}</button>}
 {a.destinations.map(d=><button key={d.id} className={buttonClass('secondary')} disabled={busy||a.selectedId===d.id||!['CONNECTED','LIMITED'].includes(a.status)} onClick={()=>ask({action:'select',provider,authorizationId:a.id,version:a.version,destinationId:d.id})}>Select {d.displayName}</button>)}
 {a.status!=='DISCONNECTED'&&<button className={buttonClass('secondary')} disabled={busy} onClick={()=>ask({action:'disconnect',provider,authorizationId:a.id,version:a.version})}>Disconnect {provider}</button>}
 </div>)}
 </Card>)}
 {pending&&<Card><form onSubmit={perform}><h2>Confirm {pending.action==='select'?'destination change':pending.action}</h2><p>Confirm your password and current authenticator code. Disconnect removes local authorization; remote revocation may require provider follow-up.</p><label>Password<input ref={passwordInput} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/></label><label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} required maxLength={6} disabled={busy}/></label><button className={buttonClass()} disabled={busy}>Confirm connection change</button><button type="button" className={buttonClass('secondary')} disabled={busy} onClick={()=>{setPending(null);setPassword('');setCode('');}}>Cancel</button></form></Card>}
 </div>;
}
