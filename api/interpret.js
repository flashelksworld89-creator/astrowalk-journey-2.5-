import { FALLBACK_VOCABULARY } from './_private/vocabulary.js';

const VALID_CATEGORIES = ['people','events','qualities','places','objects'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

const HOUSE_THEMES = {
  1:['identity','body','self-direction'], 2:['resources','speech','possessions'],
  3:['movement','communication','short journeys'], 4:['home','property','emotional foundation'],
  5:['creativity','romance','study'], 6:['work','service','health routines','obstacles'],
  7:['partners','clients','one-to-one encounters'], 8:['shared resources','secrets','sudden change'],
  9:['belief','teachers','long journeys','dharma'], 10:['career','status','responsibility'],
  11:['gains','friends','networks','goals'], 12:['retreat','expenses','foreign places','release']
};

const SIGN_THEMES = {
  Aries:['initiative','speed','assertion'], Taurus:['stability','resources','comfort'],
  Gemini:['messages','movement','exchange'], Cancer:['home','care','security'],
  Leo:['visibility','leadership','self-expression'], Virgo:['analysis','service','detail'],
  Libra:['agreement','balance','partnership'], Scorpio:['intensity','privacy','transformation'],
  Sagittarius:['travel','belief','expansion'], Capricorn:['duty','structure','achievement'],
  Aquarius:['networks','systems','unconventional activity'], Pisces:['imagination','release','uncertainty']
};

const NAKSHATRA_THEMES = {
  Ashwini:['beginnings','speed','healing'], Bharani:['pressure','containment','transition'],
  Krittika:['cutting','purification','decisiveness'], Rohini:['growth','beauty','material development'],
  Mrigashira:['searching','curiosity','movement'], Ardra:['disruption','intensity','clearing'],
  Punarvasu:['return','renewal','restoration'], Pushya:['support','nourishment','responsibility'],
  Ashlesha:['entanglement','strategy','hidden influence'], Magha:['ancestry','authority','status'],
  'Purva Phalguni':['pleasure','creativity','social enjoyment'], 'Uttara Phalguni':['agreements','support','commitment'],
  Hasta:['skill','craft','handling'], Chitra:['design','construction','visibility'],
  Swati:['independence','movement','trade'], Vishakha:['focus','ambition','goal pursuit'],
  Anuradha:['alliances','devotion','cooperation'], Jyeshtha:['seniority','protection','responsibility'],
  Mula:['roots','investigation','dismantling'], 'Purva Ashadha':['assertion','renewal','persuasion'],
  'Uttara Ashadha':['endurance','leadership','lasting achievement'], Shravana:['listening','learning','travel'],
  Dhanishta:['rhythm','resources','groups'], Shatabhisha:['healing','seclusion','systems'],
  'Purva Bhadrapada':['intensity','idealism','transition'], 'Uttara Bhadrapada':['depth','stability','completion'],
  Revati:['travel','guidance','completion']
};

const ASPECT_TONE = {
  Conjunction:'concentrates', Sextile:'opens an opportunity between', Square:'creates friction between',
  Trine:'supports an easy flow between', Quincunx:'requires adjustment between', Opposition:'polarizes'
};

function normalizeEntries(value){
  if(!Array.isArray(value)) return [];
  return value.map(item=>{
    if(typeof item==='string') return {term:item,weight:0.65};
    if(item && typeof item.term==='string') return {term:item.term.trim(),weight:clamp(Number(item.weight)||0.65,0,1)};
    return null;
  }).filter(v=>v?.term);
}

function mergePlanetBanks(base={},custom={}){
  const merged={};
  for(const cat of VALID_CATEGORIES){
    const own=normalizeEntries(custom?.[cat]);
    merged[cat]=own.length ? own : normalizeEntries(base?.[cat]);
  }
  if(Array.isArray(custom?.keywords) && custom.keywords.length){
    merged.events=[...merged.events,...normalizeEntries(custom.keywords)];
  }
  return merged;
}

function readVocabulary(){
  let custom={};
  const raw=process.env.PLANET_VOCAB_JSON;
  if(raw){
    try{ custom=JSON.parse(raw); }catch{ custom={}; }
  }
  const result={};
  const keys=new Set([...Object.keys(FALLBACK_VOCABULARY),...Object.keys(custom||{})]);
  for(const key of keys) result[key]=mergePlanetBanks(FALLBACK_VOCABULARY[key],custom?.[key]);
  return result;
}

function seededIndex(seed,length){
  let h=2166136261;
  for(let i=0;i<seed.length;i++){
    h^=seed.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return length ? (h>>>0)%length : 0;
}

function pick(entries,seed,bias=0){
  const list=normalizeEntries(entries).sort((a,b)=>b.weight-a.weight);
  if(!list.length)return null;
  const pool=list.slice(0,Math.max(1,Math.min(list.length,7)));
  return pool[seededIndex(`${seed}:${bias}`,pool.length)];
}

function planetScore(p){
  const strength=Math.abs(Number(p?.conditionStrength)||0);
  const houseBoost=[1,4,7,10].includes(Number(p?.house))?0.18:0;
  const retroBoost=p?.retrograde?0.07:0;
  const aspectBoost=Math.min((p?.aspects?.length||0)*0.06,0.24);
  return 0.5+strength*0.08+houseBoost+retroBoost+aspectBoost;
}

function cleanPlanet(p){
  return {
    id:String(p?.id||''), name:String(p?.name||''), sign:String(p?.sign||''),
    degree:Number(p?.degree)||0, house:Number(p?.house)||0,
    nakshatra:String(p?.nakshatra||''), pada:Number(p?.pada)||0,
    retrograde:Boolean(p?.retrograde), condition:String(p?.condition||''),
    conditionStrength:Number(p?.conditionStrength)||0,
    aspects:Array.isArray(p?.aspects)?p.aspects.slice(0,8):[]
  };
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST required'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const planets=(Array.isArray(body.planets)?body.planets:[]).map(cleanPlanet).filter(p=>p.id);
    if(!planets.length) return res.status(400).json({error:'No planetary data supplied'});

    const vocabulary=readVocabulary();
    const ranked=[...planets].sort((a,b)=>planetScore(b)-planetScore(a));
    const primary=ranked[0];
    const secondary=ranked.find(p=>p.id!==primary.id)||null;
    const key=`${body.date||''}|${Number(body.bearing)||0}|${primary.id}|${primary.house}|${primary.nakshatra}`;
    const bank=vocabulary[primary.id]||{};

    const picks={};
    VALID_CATEGORIES.forEach((cat,i)=>{picks[cat]=pick(bank[cat],key,i)});
    const chosen=Object.fromEntries(Object.entries(picks).filter(([,v])=>v));

    const houseThemes=HOUSE_THEMES[primary.house]||[];
    const signThemes=SIGN_THEMES[primary.sign]||[];
    const nakThemes=NAKSHATRA_THEMES[primary.nakshatra]||[];
    const aspect=primary.aspects?.[0]||null;

    const observation=[];
    if(chosen.events) observation.push(chosen.events.term);
    if(chosen.people) observation.push(`an encounter involving ${chosen.people.term}`);
    if(chosen.places) observation.push(`a place associated with ${chosen.places.term}`);
    if(chosen.objects) observation.push(`an object or activity associated with ${chosen.objects.term}`);

    let summary=`${primary.name} is a leading journey indicator at sidereal ${primary.sign} ${primary.degree.toFixed(2)}°, ${primary.nakshatra} pada ${primary.pada}, House ${primary.house}. `;
    summary+=`This combines ${signThemes.slice(0,2).join(' and ') || primary.sign.toLowerCase()} with ${nakThemes.slice(0,2).join(' and ') || primary.nakshatra.toLowerCase()} and House ${primary.house} themes of ${houseThemes.slice(0,3).join(', ')}. `;
    if(chosen.qualities) summary+=`Your private terminology layer emphasizes ${chosen.qualities.term}. `;
    if(observation.length) summary+=`For this journey, observation prompts include ${observation.slice(0,3).join(', ')}. `;
    if(aspect){
      const tone=ASPECT_TONE[aspect.type]||'connects';
      summary+=`The ${aspect.type.toLowerCase()} with ${aspect.with} ${tone} these themes (orb ${Number(aspect.orb).toFixed(2)}°). `;
    }
    if(body.direction) summary+=`The route is oriented ${String(body.direction)} at about ${Number(body.bearing||0).toFixed(0)}°. `;
    summary+=`These are interpretive observation prompts, not guaranteed events.`;

    return res.status(200).json({
      summary,
      primary:{id:primary.id,name:primary.name,house:primary.house,sign:primary.sign,nakshatra:primary.nakshatra,pada:primary.pada},
      secondary:secondary?{id:secondary.id,name:secondary.name}:null,
      selectedThemes:Object.entries(chosen).map(([category,v])=>({category,term:v.term,weight:v.weight})),
      siderealFactors:{houseThemes,signThemes,nakshatraThemes:nakThemes,aspect},
      modelVersion:'private-vocab-2'
    });
  }catch(err){
    return res.status(500).json({error:'Interpretation failed'});
  }
}
