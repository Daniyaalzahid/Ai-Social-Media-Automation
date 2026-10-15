import { z } from 'zod';

export const BRAND_ID = '6f8d30ea-7492-4eae-873a-a844a3636a01';
export const LANGUAGES = ['ENGLISH', 'URDU', 'ROMAN_URDU', 'MIXED'] as const;
export const PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'LINKEDIN'] as const;
export const TONES = ['PROFESSIONAL', 'FRIENDLY', 'PERSUASIVE', 'INFORMATIVE', 'CONVERSATIONAL', 'ENERGETIC', 'PREMIUM', 'CONCISE'] as const;
export const CLAIMS = ['PRICE', 'DISCOUNT', 'STOCK', 'WARRANTY', 'INSTALLMENT', 'SPECIFICATION', 'ADDRESS', 'CONTACT', 'DELIVERY', 'INSTALLATION', 'SUPERLATIVE', 'EXCLUSIVITY', 'PARTNERSHIP'] as const;
export const POLICIES = ['EXPLICIT_POST_INPUT', 'APPROVED_FACT_OR_INPUT', 'EXPLICIT_APPROVAL_REQUIRED'] as const;
// Lengths count Unicode code points. Preserve copy verbatim; reject ill-formed UTF-16/control data.
export const text = (max: number, required = false) => z.string().refine((v) => v.isWellFormed() && Array.from(v).every((c) => c === '\n' || c === '\t' || !/\p{Cc}/u.test(c)), 'Use valid text without control characters.').refine((v) => Array.from(v).length <= max && (!required || v.trim().length > 0), `Use ${required ? '1' : '0'}–${max} characters.`);
const unique = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max).refine((v) => new Set(v.map((x) => JSON.stringify(x))).size === v.length, 'Remove duplicates.');
const nullableId = z.uuid().nullable();
const language = z.enum(LANGUAGES);
const platform = z.enum(PLATFORMS);
const tones = unique(z.enum(TONES), 8);
const notes = text(400);
const label = text(100, true);
const state = { active: z.boolean(), approved: z.boolean(), sort_order: z.number().int().min(0).max(999) };
const url = text(500).refine((v) => { if (!v) return true; try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password && !u.hash; } catch { return false; } }, 'Use an HTTPS URL without credentials or fragment.').transform((v) => v ? new URL(v).href : '').pipe(text(500));
const timezone = z.string().max(80).refine((v) => { try { new Intl.DateTimeFormat('en', { timeZone: v }); return true; } catch { return false; } }, 'Choose a valid timezone.');
const hashtag = z.string().max(80).regex(/^#[\p{L}\p{M}\p{N}_]+$/u).transform((v) => v.normalize('NFC').toLowerCase()).pipe(z.string().max(80));
const tags = unique(hashtag, 20);
const emoji = text(16, true).refine((v) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(v) && Array.from(v).every((c) => /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}/u.test(c) || c === '\uFE0F' || c === '\u200D'), 'Use an emoji sequence.');
export const schemas = {
  profile: z.object({ name: label, website: url, short_description: text(300), business_type: text(100), country: text(80), timezone, summary: text(600), ...state, active: z.literal(true), approved: z.literal(true) }).strict(),
  contacts: z.object({ label, type: z.enum(['PHONE', 'WHATSAPP', 'EMAIL', 'WEBSITE']), normalized_value: text(500, true), display_value: text(150, true), usage_context: z.enum(['GENERAL', 'SALES', 'SUPPORT', 'WHATSAPP_CTA']), is_primary: z.boolean(), ...state }).strict().superRefine((v,c) => {
    const value = v.normalized_value;
    const valid = v.type === 'EMAIL' ? z.email().max(254).safeParse(value.trim().normalize('NFC').toLowerCase()).success : v.type === 'WEBSITE' ? url.safeParse(value).success && !!value : /^\+[1-9][0-9]{6,14}$/.test(value);
    if (!valid) c.addIssue({ code: 'custom', path: ['normalized_value'], message: 'Use a valid email, HTTPS website or international +country phone number.' });
  }).transform((v) => ({ ...v, normalized_value: v.type === 'EMAIL' ? v.normalized_value.trim().normalize('NFC').toLowerCase() : v.type === 'WEBSITE' ? new URL(v.normalized_value).href : v.normalized_value })),
  locations: z.object({ name: label, city: text(100, true), address: text(400), short_label: text(80), contact_id: nullableId, ...state }).strict(),
  language: z.object({ default_language: language, allowed_languages: unique(language, 4).min(1), mixing: z.enum(['NONE', 'ENGLISH_ROMAN_URDU']), guidance: notes, ...state }).strict().refine((v) => v.allowed_languages.includes(v.default_language) && (v.mixing === 'NONE' || v.allowed_languages.includes('MIXED')), { message: 'Default language must be allowed; mixing requires MIXED.', path: ['allowed_languages'] }),
  voice: z.object({ tones, guidance: notes, ...state }).strict(),
  platforms: z.object({ platform, guidance: notes, tones, ...state }).strict(),
  ctas: z.object({ text: text(200, true), language, platform: platform.nullable(), context: text(100), ...state }).strict(),
  claims: z.object({ category: z.enum(CLAIMS), policy: z.enum(POLICIES), ...state }).strict(),
  facts: z.object({ category: z.enum(CLAIMS), label, fact: text(400, true), ...state }).strict(),
  wording: z.object({ phrase: text(120, true), rule_type: z.enum(['BANNED', 'DISCOURAGED']), language, reason: text(200), ...state }).strict(),
  hashtags: z.object({ platform: z.enum(['GLOBAL', ...PLATFORMS]), enabled: z.boolean(), minimum: z.number().int().min(0).max(20), maximum: z.number().int().min(0).max(20), brand_tags: tags, banned_tags: tags, ...state }).strict().refine((v) => v.minimum <= v.maximum && (v.enabled || v.minimum === 0 && v.maximum === 0) && !v.brand_tags.some((t) => v.banned_tags.includes(t)), { message: 'Check counts, disabled counts and conflicting hashtags.', path: ['maximum'] }),
  emoji: z.object({ intensity: z.enum(['NONE', 'MINIMAL', 'MODERATE']), preferred: unique(emoji, 12), prohibited: unique(emoji, 12), ...state }).strict().refine((v) => !v.preferred.some((e) => v.prohibited.includes(e)) && (v.intensity !== 'NONE' || v.preferred.length === 0), { message: 'Check conflicting emojis and NONE preference.', path: ['preferred'] }),
  categories: z.object({ name: label, selling_points: unique(text(160, true), 6), guidance: notes, prohibited_claims: unique(z.enum(CLAIMS), 13), cta_id: nullableId, platform_notes: notes, ...state }).strict(),
  seasons: z.object({ name: label, guidance: notes, language: language.nullable(), tones, cta_id: nullableId, ...state }).strict(),
  examples: z.object({ title: label, platform, language, content: text(1600, true), category_id: nullableId, context: text(100), ...state }).strict(),
} as const;
export type Kind = keyof typeof schemas;
export const KINDS = Object.keys(schemas) as Kind[];
export type BrandData<K extends Kind = Kind> = z.output<(typeof schemas)[K]>;
export type BrandRecord = { id: string; kind: Kind; data: BrandData };
export type BrandSnapshot = { brandId: string; revision: number; updatedAt: string; canManage: boolean; records: BrandRecord[] };
export const LIMITS: Record<Kind, number> = { profile: 1, contacts: 20, locations: 20, language: 1, voice: 1, platforms: 5, ctas: 40, claims: 13, facts: 40, wording: 80, hashtags: 6, emoji: 1, categories: 20, seasons: 16, examples: 24 };
export const mutationSchema = z.object({ brandId: z.uuid(), expectedRevision: z.number().int().positive().max(2147483646), kind: z.enum(KINDS as [Kind,...Kind[]]), id: z.uuid().nullable(), data: z.unknown() }).strict();
export function comparisonPhrase(value: string) { return value.normalize('NFC').toLowerCase().replace(/\s+/gu, ' ').trim(); }
export function claimPolicy(value: unknown): typeof POLICIES[number] { return z.enum(POLICIES).parse(value); }
export const snapshotSchema = z.object({ brandId:z.uuid(),revision:z.number().int().positive(),updatedAt:z.iso.datetime(),canManage:z.boolean(),records:z.array(z.object({id:z.uuid(),kind:z.enum(KINDS as [Kind,...Kind[]]),data:z.unknown()}).strict().transform((r)=>({...r,data:schemas[r.kind].parse(r.data)}))).max(400) }).strict();

export type ContextData<K extends Kind> = Omit<BrandData<K>, 'active'|'approved'|'sort_order'|'contact_id'|'cta_id'|'category_id'>
 & (K extends 'locations' ? {contact:ContextData<'contacts'>|null} : K extends 'categories'|'seasons' ? {cta:ContextData<'ctas'>|null} : K extends 'examples' ? {category:ContextData<'categories'>|null} : K extends 'wording' ? {comparison_phrase:string} : object);
