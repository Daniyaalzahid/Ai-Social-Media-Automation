// @vitest-environment jsdom
import { render,screen,fireEvent } from '@testing-library/react';
import { describe,it,expect } from 'vitest';
import { BrandBrain } from '../../src/features/brand/brand-brain';
import { BRAND_ID,type BrandSnapshot } from '../../src/features/brand/model';
const snapshot:BrandSnapshot={brandId:BRAND_ID,revision:1,updatedAt:'2026-10-15T00:00:00.000Z',canManage:false,records:[{id:BRAND_ID,kind:'profile',data:{name:'Synthetic brand',website:'https://example.test/',short_description:'<script>bad()</script> اردو',business_type:'',country:'',timezone:'Asia/Karachi',summary:'',active:true,approved:true,sort_order:0}}]};
describe('Brand Brain presentation',()=>{
 it('read-only approved marketing data has labeled keyboard tabs and no mutation controls',()=>{render(<BrandBrain initial={snapshot}/>);expect(screen.getByRole('tablist',{name:'Brand Brain sections'})).toBeInTheDocument();expect(screen.getAllByRole('tab')).toHaveLength(10);expect(screen.getByText('Read only')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Edit brand'})).not.toBeInTheDocument();expect(screen.getByText('<script>bad()</script> اردو')).toBeInTheDocument();expect(document.querySelector('script')).toBeNull();});
 it('Owner editing uses existing controls and displays authoritative revision',()=>{render(<BrandBrain initial={{...snapshot,canManage:true}}/>);expect(screen.getByRole('button',{name:'Edit brand'})).toBeInTheDocument();expect(screen.getByText('Revision 1')).toBeInTheDocument();});
 it('surfaces display-order and profile-approval validation errors instead of silently blocking save',()=>{
  render(<BrandBrain initial={{...snapshot,canManage:true}}/>);fireEvent.click(screen.getByRole('button',{name:'Edit brand'}));
  fireEvent.change(screen.getByLabelText('Display order (0–999)'),{target:{value:'-1'}});fireEvent.click(screen.getByLabelText('I approve this record for brand context'));
  fireEvent.submit(screen.getByRole('form',{name:'Edit Brand'}));expect(screen.getByLabelText('Display order (0–999)')).toHaveAttribute('aria-invalid','true');expect(screen.getByRole('alert')).toHaveTextContent('approved:');
 });

});

describe('Brand Brain typed reference display adversarial regression',()=>{
 it('does not display a contact as a CTA when their valid UUIDs coincide',async()=>{
  const {sample,recordId}=await import('../helpers/brand-review-fixtures');const id=recordId(1);
  render(<BrandBrain initial={{...snapshot,canManage:true,records:[...snapshot.records,{id,kind:'contacts',data:sample('contacts',{label:'Wrong reference kind'}) as BrandSnapshot['records'][number]['data']},{id,kind:'ctas',data:sample('ctas',{text:'Intended CTA reference'}) as BrandSnapshot['records'][number]['data']},{id:recordId(2),kind:'categories',data:sample('categories',{cta_id:id}) as BrandSnapshot['records'][number]['data']}]}}/>);
  fireEvent.click(screen.getByRole('tab',{name:'Categories'}));expect(screen.queryByText('Intended CTA reference')!==null).toBe(true);
 });
});
