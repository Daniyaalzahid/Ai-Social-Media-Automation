// @vitest-environment jsdom
import { render,screen,cleanup } from '@testing-library/react';
import { afterEach,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { GenerationPanel } from '../../src/features/ai/generation-panel';
afterEach(cleanup);
it('provides labelled bounded inputs and no publish/schedule action',()=>{render(<GenerationPanel revision={1} languages={['ENGLISH']} defaultLanguage="ENGLISH" initial={[]}/>);expect(screen.getByLabelText('Creative brief')).toHaveAttribute('maxLength','2000');expect(screen.getByLabelText('Exact authorized value')).toHaveAttribute('maxLength','400');expect(screen.getByRole('status')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Generate draft'})).not.toBeDisabled();expect(screen.queryByRole('button',{name:/publish|schedule/i})).toBeNull();expect(screen.getByText(/Text-only generation/)).toBeInTheDocument();});
it('renders even hostile caption props as text and labels human review',()=>{const value='<img src=x onerror="unsafe()">';render(<GenerationPanel revision={1} languages={['ENGLISH']} defaultLanguage="ENGLISH" initial={[{id:randomUUID(),createdAt:new Date().toISOString(),completedAt:new Date().toISOString(),brandRevision:1,provider:'openrouter',model:'test/model:free',platforms:['FACEBOOK'],language:'ENGLISH',status:'COMPLETED',failure:null,output:{FACEBOOK:{caption:value,hashtags:[]}}}]}/>);expect(screen.getByText(value)).toBeInTheDocument();expect(document.querySelector('img')).toBeNull();expect(screen.getByText('AI-generated draft · requires human review')).toBeInTheDocument();});
