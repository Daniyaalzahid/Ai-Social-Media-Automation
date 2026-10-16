import 'server-only';
import { getDatabase } from '../db/client';
import { createAiGenerationService } from './service';
import { OpenRouterGenerationProvider } from './provider';
export function aiService(){return createAiGenerationService(getDatabase(),{providerId:'openrouter',model:process.env.OPENROUTER_MODEL??'unconfigured',provider:()=>new OpenRouterGenerationProvider(process.env)});}
