import { CLAIMS, LANGUAGES, PLATFORMS, POLICIES, TONES, type Kind } from './model';
export type Field = { name: string; label: string; type?: 'text' | 'long' | 'number' | 'boolean' | 'select' | 'list' | 'choices' | 'reference'; options?: readonly string[]; nullable?: boolean; reference?: Kind; initial?: unknown };
const f = (name: string, label: string, type: Field['type'] = 'text', options?: readonly string[]): Field => ({ name, label, type, ...(options ? { options } : {}) });
const lang = () => f('language', 'Language', 'select', LANGUAGES);
const platform = () => f('platform', 'Platform', 'select', PLATFORMS);
const tones = () => f('tones', 'Tone attributes', 'choices', TONES);
const guidance = () => f('guidance', 'Guidance (up to 400 characters)', 'long');
const ref = (name: string, label: string, reference: Kind): Field => ({ name, label, type: 'reference', reference, nullable: true });
export const FIELDS: Record<Kind, Field[]> = {
 profile: [f('name','Brand name'),f('website','Website (HTTPS)'),f('short_description','Short description','long'),f('business_type','Business type'),f('country','Market / country'),{ ...f('timezone','Default timezone'),initial:'Asia/Karachi' },f('summary','Brand summary','long')],
 contacts: [f('label','Contact label'),f('type','Contact type','select',['PHONE','WHATSAPP','EMAIL','WEBSITE']),f('normalized_value','Machine value (+country phone, email or HTTPS URL)'),f('display_value','Display value'),f('usage_context','Usage context','select',['GENERAL','SALES','SUPPORT','WHATSAPP_CTA']),f('is_primary','Primary contact for this type','boolean')],
 locations: [f('name','Branch name'),f('city','City'),f('address','Approved address','long'),f('short_label','Short location label'),ref('contact_id','Associated contact','contacts')],
 language: [f('default_language','Default language','select',LANGUAGES),f('allowed_languages','Allowed languages','choices',LANGUAGES),f('mixing','Mixing behavior','select',['NONE','ENGLISH_ROMAN_URDU']),guidance()],
 voice: [tones(),guidance()], platforms: [platform(),tones(),guidance()],
 ctas: [f('text','CTA text','long'),lang(),{...platform(),nullable:true},f('context','Category / usage context')],
 claims: [f('category','Claim category','select',CLAIMS),f('policy','Claim source policy','select',POLICIES)],
 facts: [f('label','Fact label'),f('category','Claim category','select',CLAIMS),f('fact','Approved persistent fact','long')],
 wording: [f('phrase','Phrase'),f('rule_type','Rule type','select',['BANNED','DISCOURAGED']),lang(),f('reason','Reason','long')],
 hashtags: [f('platform','Scope','select',['GLOBAL',...PLATFORMS]),f('enabled','Hashtags enabled','boolean'),f('minimum','Preferred minimum','number'),f('maximum','Preferred maximum','number'),f('brand_tags','Brand hashtags (one per line)','list'),f('banned_tags','Banned hashtags (one per line)','list')],
 emoji: [f('intensity','Emoji use','select',['NONE','MINIMAL','MODERATE']),f('preferred','Preferred emojis (one per line)','list'),f('prohibited','Prohibited emojis (one per line)','list')],
 categories: [f('name','Category name'),f('selling_points','Approved selling points (one per line)','list'),guidance(),f('prohibited_claims','Prohibited claim categories','choices',CLAIMS),ref('cta_id','CTA guidance','ctas'),f('platform_notes','Platform notes','long')],
 seasons: [f('name','Season / campaign context'),guidance(),{...lang(),nullable:true},tones(),ref('cta_id','CTA guidance','ctas')],
 examples: [f('title','Example title'),platform(),lang(),f('content','Approved example (up to 1600 characters)','long'),ref('category_id','Category','categories'),f('context','Usage context')],
};
export const TITLES: Record<Kind,string> = { profile:'Brand',contacts:'Contacts',locations:'Locations',language:'Language',voice:'Voice',platforms:'Platform guidance',ctas:'CTAs',claims:'Claim policies',facts:'Persistent facts',wording:'Banned wording',hashtags:'Hashtags',emoji:'Emoji',categories:'Categories',seasons:'Seasonal guidance',examples:'Approved examples' };
export function emptyData(kind: Kind): Record<string,unknown> { return Object.fromEntries([...FIELDS[kind].map((field) => [field.name,field.initial ?? (field.nullable ? null : field.type === 'boolean' ? false : field.type === 'number' ? 0 : field.type === 'list' || field.type === 'choices' ? [] : field.type === 'select' ? field.options?.[0] ?? '' : '')]),['active',true],['approved',false],['sort_order',0]]); }
