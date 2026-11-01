const KEY = 'fighter.custom.slots.v2';
const ACTIVE_KEY = 'fighter.custom.activeSlot.v1';
export const defaults = {
  name:'MY FIGHTER', color:'#2869b5', accent:'#e6b84c', skin:'#b97855', hair:'#20232c', bottomColor:'#202a3b', eyeColor:'#171b24',
  hairStyle:'short', build:'athletic', outfit:'classic', style:'balanced', face:'oval', brows:'normal', beard:'none',
  top:'tee', bottom:'pants', gloves:'wraps', shoes:'high', accessory:'none', height:100, width:100, legs:100, muscle:50
};
const choices = {hairStyle:['short','spiky','long','curly','bald'],build:['slim','athletic','bulky'],outfit:['classic','street','combat'],style:['balanced','fast','power','tank','technical'],face:['oval','square','round'],brows:['normal','strong','angled'],beard:['none','stubble','beard','mustache'],top:['tee','jacket','hoodie','vest'],bottom:['pants','shorts','joggers'],gloves:['wraps','boxing','none'],shoes:['high','boots','light'],accessory:['none','glasses','headband','chain','mask']};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||min));
export function cleanFighter(value={}) {
  const out={...defaults,...value};
  out.name=String(out.name||defaults.name).trim().slice(0,18)||defaults.name;
  for(const [key,allowed] of Object.entries(choices)) if(!allowed.includes(out[key])) out[key]=defaults[key];
  for(const key of ['color','accent','skin','hair','bottomColor','eyeColor']) if(!/^#[0-9a-f]{6}$/i.test(out[key])) out[key]=defaults[key];
  out.height=clamp(out.height,90,112); out.width=clamp(out.width,85,115); out.legs=clamp(out.legs,90,110); out.muscle=clamp(out.muscle,0,100);
  return out;
}
export function loadSlots(){try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return [0,1,2].map(i=>v[i]?cleanFighter(v[i]):null);}catch{return [null,null,null];}}
export function loadCustomFighter(slot=0){return loadSlots()[slot]||{...defaults};}
export function hasCustomFighter(){return loadSlots().some(Boolean);}
export function getActiveCustomSlot(){try{const n=Number(localStorage.getItem(ACTIVE_KEY));return Number.isInteger(n)&&n>=0&&n<3?n:0;}catch{return 0;}}
export function setActiveCustomSlot(slot){const n=Number(slot);if(!Number.isInteger(n)||n<0||n>2)throw new RangeError('Character slot must be 1, 2 or 3.');localStorage.setItem(ACTIVE_KEY,String(n));return n;}
export function saveCustomFighter(value,slot=0){const n=Number(slot);if(!Number.isInteger(n)||n<0||n>2)throw new RangeError('Character slot must be 1, 2 or 3.');const slots=loadSlots();const clean=cleanFighter(value);slots[n]=clean;localStorage.setItem(KEY,JSON.stringify(slots));return clean;}
export function toFighter(value){const c=cleanFighter(value);const hex=v=>Number.parseInt(v.slice(1),16);const builds={slim:.9,athletic:1,bulky:1.12};return {id:'custom',name:c.name.toUpperCase(),title:`${c.style.toUpperCase()} FIGHTER`,color:hex(c.color),accent:hex(c.accent),skin:hex(c.skin),hair:hex(c.hair),style:c.style,specialName:'CUSTOM FINISHER',bio:'A fighter built by you.',stats:{power:3,speed:3,guard:3},appearance:{...c,bodyScale:builds[c.build]||1,heightScale:c.height/100,widthScale:c.width/100,legScale:c.legs/100,muscle:c.muscle/100}};}
