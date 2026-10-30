import Link from 'next/link';
import { buttonClass } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { PageHeader } from '../../components/ui/page-header';
import { ContentListing } from '../content/workspace';
import type { ContentList } from '../content/model';
import { publicationSummary } from '../composer/model';
export function Overview({canCreate=true,canSeePublishing=true,posts}:{canCreate?:boolean;canSeePublishing?:boolean;posts:ContentList}){
 const states=posts.items.map(item=>item.preview?.publicationStates.length?publicationSummary(item.preview.publicationStates.map(state=>({state}))):item.state==='DRAFT'?'Draft':item.state==='IN_REVIEW'?'Awaiting review':'Approved');
 return <div className="dashboard-overview"><PageHeader eyebrow="BISMILLAH SOCIAL AI" title="Overview" description="Your next post starts here." action={canCreate?<Link href="/create-post" className={buttonClass()}><Icon name="plus"/> Create Post</Link>:undefined}/><p className="field-help">A snapshot of {posts.items.length} posts you can access.</p><div className="metrics-grid">{['Published','Draft','Failed','Awaiting review'].map(label=><Card key={label} className="metric-card"><h2>{label==='Draft'?'Drafts':label}</h2><p className="metric-value">{!canSeePublishing&&['Published','Failed'].includes(label)?'—':states.filter(s=>s===label).length}</p></Card>)}</div><Card><h2>Recent Posts</h2><p className="field-help">Recent posts from this access-scoped snapshot.</p><p><Link className="text-link" href="/content">View all posts</Link></p><ContentListing compact initial={{items:[...posts.items].sort((a,b)=>(b.preview?.createdAt??'').localeCompare(a.preview?.createdAt??'')).slice(0,5),cursor:null}}/></Card><p className="field-help">Scheduling is not available yet. No automatic delivery is promised.</p></div>;
}
