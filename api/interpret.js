import { FALLBACK_VOCABULARY } from './_private/vocabulary.js';

const VALID_CATEGORIES=['people','events','qualities','places','objects'];
const HOUSE_THEMES={
  1:['identity','body','appearance','personal initiative'],2:['money','speech','family resources','possessions'],3:['messages','siblings','skills','short travel'],4:['home','property','mother/family','private life'],5:['children','romance','creativity','study'],6:['work','service','health routines','debts','conflict'],7:['partners','clients','agreements','open opponents'],8:['shared money','secrets','inheritance','sudden change'],9:['teachers','belief','higher learning','long travel'],10:['career','status','authority','public responsibilities'],11:['friends','networks','income','goals'],12:['retreat','expenses','foreign settings','seclusion','release']
};
const KARAKA={
  sun:{people:['authority figure','manager','father or paternal figure','official','leader'],events:['recognition','leadership decision','visibility','contact with authority'],positive:['recognition','clear direction','confidence','support from an influential person'],negative:['ego conflict','pressure from authority','overexposure','pride-driven disagreement']},
  moon:{people:['mother or maternal figure','caretaker','member of the public','family member'],events:['family matter','change of mood','public interaction','food/home concern'],positive:['supportive care','help from family','emotional connection','useful public response'],negative:['emotional reactivity','uncertainty','family tension','rapidly changing conditions']},
  mercury:{people:['student','writer','merchant','driver','messenger','analyst'],events:['message','conversation','transaction','short trip','document exchange'],positive:['useful information','successful negotiation','helpful introduction','efficient travel'],negative:['mixed messages','misunderstanding','wrong turn','paperwork or device problem']},
  venus:{people:['partner','artist','designer','diplomatic person','social contact'],events:['social encounter','agreement','attraction','purchase','aesthetic experience'],positive:['pleasant meeting','cooperation','gift or benefit','harmonious agreement'],negative:['overindulgence','social distraction','awkward attraction','money spent for comfort']},
  mars:{people:['athlete','mechanic','soldier','surgeon','competitor','assertive person'],events:['competition','argument','physical effort','repair','rapid action'],positive:['decisive action','successful repair','courageous intervention','productive physical effort'],negative:['argument','impatience','minor injury risk','mechanical problem','reckless action']},
  jupiter:{people:['teacher','mentor','advisor','counselor','judge','benefactor'],events:['guidance','learning','opportunity','expansion','legal or educational matter'],positive:['helpful advice','fortunate introduction','learning opportunity','support from a mentor'],negative:['overconfidence','excess','poor judgment through optimism','promising more than can be delivered']},
  saturn:{people:['elder','manager','worker','official','technician','serious person'],events:['delay','duty','restriction','repair','administrative requirement'],positive:['disciplined progress','useful boundary','reliable assistance','completion through patience'],negative:['delay','denial','fatigue','bureaucratic obstacle','cold or difficult encounter']},
  uranus:{people:['innovator','outsider','technologist','unconventional person'],events:['surprise','disruption','technical change','sudden redirection'],positive:['breakthrough','unexpected solution','fresh connection','useful change of plan'],negative:['disruption','instability','technology failure','abrupt separation']},
  neptune:{people:['artist','healer','spiritual person','confused or elusive person'],events:['inspiration','misdirection','unclear situation','creative or spiritual encounter'],positive:['inspiration','compassion','creative insight','meaningful quiet encounter'],negative:['confusion','misreading signals','loss of direction','unclear boundaries']},
  pluto:{people:['investigator','powerful person','crisis worker','intense personality'],events:['hidden issue surfaces','power struggle','deep change','intense encounter'],positive:['decisive transformation','important discovery','strong focus','release of an old pattern'],negative:['control struggle','obsession','intimidating encounter','hidden complication']},
  rahu:{people:['foreigner or outsider','ambitious person','unusual contact','technology-oriented person'],events:['novel encounter','amplification','unexpected desire','foreign or unfamiliar influence'],positive:['new opportunity','unusual connection','rapid learning','ambitious opening'],negative:['obsession','misjudgment from novelty','exaggeration','unreliable attraction']},
  ketu:{people:['specialist','solitary person','spiritual person','detached contact'],events:['separation','completion','withdrawal','specialized problem'],positive:['clean ending','precision','insight through detachment','useful simplification'],negative:['disconnection','missed engagement','abrupt ending','lack of interest or clarity']}
};
const ASPECT_EFFECT={
  Conjunction:{tone:0,text:'concentrates and intensifies'},Sextile:{tone:1,text:'opens a usable opportunity through'},Square:{tone:-1,text:'creates friction or a problem requiring action around'},Trine:{tone:1,text:'supports a relatively easy development through'},Quincunx:{tone:-.45,text:'requires adjustment, compromise or recalibration around'},Opposition:{tone:-.7,text:'brings an encounter, polarity or external pressure around'}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function normalizeEntries(v){if(!Array.isArray(v))return[];return v.map(x=>typeof x==='string'?{term:x,weight:.65}:x&&typeof x.term==='string'?{term:x.term.trim(),weight:clamp(Number(x.weight)||.65,0,1)}:null).filter(Boolean)}
function mergeBank(base={},custom={}){const m={};for(const c of VALID_CATEGORIES){const own=normalizeEntries(custom?.[c]);m[c]=own.length?own:normalizeEntries(base?.[c])}return m}
function readVocabulary(){let custom={};try{if(process.env.PLANET_VOCAB_JSON)custom=JSON.parse(process.env.PLANET_VOCAB_JSON)}catch{}const out={};for(const k of new Set([...Object.keys(FALLBACK_VOCABULARY),...Object.keys(custom||{})]))out[k]=mergeBank(FALLBACK_VOCABULARY[k],custom?.[k]);return out}
function seedIndex(seed,n){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}return n?(h>>>0)%n:0}
function pick(entries,seed){const list=normalizeEntries(entries).sort((a,b)=>b.weight-a.weight).slice(0,10);return list[seedIndex(seed,list.length)]||null}
function uniq(arr){return [...new Set(arr.filter(Boolean))]}
function joinNatural(arr){const a=uniq(arr);if(a.length<=1)return a[0]||'';if(a.length===2)return `${a[0]} or ${a[1]}`;return `${a.slice(0,-1).join(', ')}, or ${a[a.length-1]}`}
function conditionTone(p){const s=Number(p.conditionStrength)||0;return s>0?.25:s<0?-.25:0}
function aspectScore(a){const eff=ASPECT_EFFECT[a?.type]||{tone:0};const tight=1-Math.min(Number(a?.orb)||6,6)/6;return eff.tone*(.65+.35*tight)}
function ruledHouses(body,planetId){return (body.houseLords||[]).filter(h=>h.lordId===planetId)}
function natalPlanetHouse(body,natalId){return (body.natalPlanets||[]).find(p=>p.id===natalId)?.house||null}
function keywordManifestations(bank,seed){return {
  event:pick(bank.events,`${seed}|event`)?.term,
  person:pick(bank.people,`${seed}|person`)?.term,
  place:pick(bank.places,`${seed}|place`)?.term,
  object:pick(bank.objects,`${seed}|object`)?.term,
  quality:pick(bank.qualities,`${seed}|quality`)?.term
}}
function planetForecast(p,body,vocab){
  const bank=vocab[p.id]||{},k=KARAKA[p.id]||{people:[],events:[],positive:[],negative:[]};
  const zone=body.destinationZone||{};
  const natalContacts=(body.transitNatalAspects||[]).filter(a=>a.transitId===p.id).sort((a,b)=>a.orb-b.orb);
  const houseContacts=(body.natalHouseAspects||[]).filter(a=>a.transitId===p.id).sort((a,b)=>a.orb-b.orb);
  const currentContacts=(p.aspects||[]).slice().sort((a,b)=>a.orb-b.orb);
  const rules=ruledHouses(body,p.id);
  const kw=keywordManifestations(bank,`${body.date}|${p.id}`);
  let score=conditionTone(p);
  natalContacts.slice(0,3).forEach(a=>score+=aspectScore(a));
  if(p.house===zone.house)score+=.4;
  if(houseContacts.some(a=>a.house===zone.house))score+=.3;
  score=clamp(score,-1.5,1.5);
  const tone=score>.35?'constructive':score<-.35?'challenging':'mixed';

  const activatedNatalHouses=uniq([
    ...rules.map(h=>h.house),
    ...natalContacts.map(a=>natalPlanetHouse(body,a.natalId)),
    ...houseContacts.slice(0,3).map(a=>a.house)
  ]).filter(Boolean);
  const themes=uniq(activatedNatalHouses.flatMap(h=>HOUSE_THEMES[h]||[])).slice(0,6);

  const eventPool=uniq([kw.event,...k.events]);
  const peoplePool=uniq([kw.person,...k.people]);
  const eventExamples=eventPool.slice(0,4);
  const peopleExamples=peoplePool.slice(0,4);
  const positive=uniq([...(k.positive||[]),kw.quality&&`a constructive expression of ${kw.quality}`]).slice(0,4);
  const challenging=uniq([...(k.negative||[]),kw.quality&&`an excessive or difficult expression of ${kw.quality}`]).slice(0,4);

  const triggers=[];
  if(natalContacts[0]){const a=natalContacts[0],nh=natalPlanetHouse(body,a.natalId);triggers.push(`${p.name} ${a.type.toLowerCase()} natal ${a.natalName}${nh?` in natal House ${nh}`:''} (${Number(a.orb).toFixed(2)}° orb)`)}
  if(rules.length)triggers.push(`${p.name} rules natal House${rules.length>1?'s':''} ${rules.map(r=>r.house).join(' & ')}`);
  if(p.house===zone.house)triggers.push(`${p.name} is transiting the destination's current House ${zone.house} zone`);
  const zoneHit=houseContacts.find(a=>a.house===zone.house);if(zoneHit)triggers.push(`${p.name} ${zoneHit.type.toLowerCase()} the natal House ${zone.house} cusp (${Number(zoneHit.orb).toFixed(2)}° orb)`);
  if(currentContacts[0])triggers.push(`current ${p.name} ${currentContacts[0].type.toLowerCase()} ${currentContacts[0].with}`);

  const destinationLine=zone.house?`Because the route points into current House ${zone.house}, watch for these themes particularly as you approach or move through the destination zone.`:'Use these as themes to observe during the journey.';
  const headline=`${p.name}: ${tone==='constructive'?'supportive event potential':tone==='challenging'?'higher-friction event potential':'mixed event potential'} around ${joinNatural(themes.slice(0,3))||'the journey'}.`;
  const eventText=`Possible events: ${joinNatural(eventExamples)}${kw.place?`; possibly around ${kw.place}`:''}${kw.object?` or involving ${kw.object}`:''}.`;
  const peopleText=`People you may encounter or deal with: ${joinNatural(peopleExamples)}.`;
  return {headline,eventText,peopleText,positiveText:`Constructive expression: ${joinNatural(positive)}.`,challengingText:`Challenging expression: ${joinNatural(challenging)}.`,destinationText:destinationLine,triggers,tone,score:Number(score.toFixed(2)),themes,planet:p.id};
}
function houseForecast(h,body,vocab){
  const zone=body.destinationZone||{};
  const lord=(body.houseLords||[]).find(x=>x.house===h);
  const inHouse=(body.planets||[]).filter(p=>p.house===h);
  const cuspContacts=(body.natalHouseAspects||[]).filter(a=>a.house===h).sort((a,b)=>a.orb-b.orb);
  const rulers=lord?[lord.lordName]:[];
  const topics=HOUSE_THEMES[h]||[];
  const planetKaraka=inHouse.flatMap(p=>(KARAKA[p.id]?.people||[]).slice(0,2));
  const people=uniq([...planetKaraka,...rulers.map(x=>`${x}-type person`)]).slice(0,4);
  const eventSeeds=uniq(inHouse.flatMap(p=>KARAKA[p.id]?.events||[])).slice(0,5);
  const positive=uniq(inHouse.flatMap(p=>KARAKA[p.id]?.positive||[])).slice(0,4);
  const negative=uniq(inHouse.flatMap(p=>KARAKA[p.id]?.negative||[])).slice(0,4);
  let score=0;cuspContacts.slice(0,3).forEach(a=>score+=aspectScore(a));if(h===zone.house)score+=.35;score=clamp(score,-1.5,1.5);
  const tone=score>.35?'constructive':score<-.35?'challenging':'mixed';
  const triggers=[];
  if(lord)triggers.push(`natal House ${h} is ruled by ${lord.lordName}, placed in natal House ${lord.lordHouse}`);
  if(inHouse.length)triggers.push(`${inHouse.map(p=>p.name).join(', ')} ${inHouse.length===1?'is':'are'} transiting current House ${h}`);
  cuspContacts.slice(0,3).forEach(a=>triggers.push(`${a.transitName} ${a.type.toLowerCase()} natal House ${h} cusp (${Number(a.orb).toFixed(2)}° orb)`));
  if(h===zone.house)triggers.push(`the destination bearing falls inside current House ${h}`);
  return {
    headline:`House ${h}: ${tone==='constructive'?'supportive':tone==='challenging'?'challenging':'mixed'} activation of ${joinNatural(topics.slice(0,4))}.`,
    eventText:`Possible events in this zone: ${joinNatural(eventSeeds.length?eventSeeds:[`developments involving ${topics[0]}`,`a situation involving ${topics[1]||topics[0]}`])}.`,
    peopleText:`People emphasized here: ${joinNatural(people.length?people:['people connected with these house topics'])}.`,
    positiveText:`Constructive expression: ${joinNatural(positive.length?positive:[`progress involving ${topics[0]}`,`a useful development involving ${topics[1]||topics[0]}`])}.`,
    challengingText:`Challenging expression: ${joinNatural(negative.length?negative:[`friction involving ${topics[0]}`,`a delay or complication involving ${topics[1]||topics[0]}`])}.`,
    destinationText:h===zone.house?'This is the current destination zone, so its manifestations receive extra weight during the approach and arrival.':'This house is active in the chart but is not the primary destination-bearing zone.',
    triggers,tone,score:Number(score.toFixed(2)),themes:topics,house:h
  };
}
function summaryForecast(body,planetForecasts){
  const zone=body.destinationZone||{};
  const ranked=Object.values(planetForecasts).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score)).slice(0,3);
  const topEvents=uniq(ranked.flatMap(x=>x.eventText.replace(/^Possible events:\s*/,'').replace(/\.$/,'').split(/, |; /))).slice(0,5);
  const topPeople=uniq(ranked.flatMap(x=>x.peopleText.replace(/^People you may encounter or deal with:\s*/,'').replace(/\.$/,'').split(/, | or /))).slice(0,4);
  return `The route runs ${Number(body.bearing||0).toFixed(0)}° ${body.direction||''} into current House ${zone.house||'—'} (${zone.sign||'—'}). The strongest combined natal/transit signals emphasize possible events such as ${joinNatural(topEvents)}. People or roles emphasized include ${joinNatural(topPeople)}. Open a planet or house for the constructive and challenging versions plus the exact natal/transit triggers behind the forecast. These are astrological possibilities to observe, not guaranteed events.`;
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'POST required'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const planets=Array.isArray(body.planets)?body.planets:[];
    if(!planets.length)return res.status(400).json({error:'No planetary data supplied'});
    const vocab=readVocabulary();
    const planetPredictions={};for(const p of planets)planetPredictions[p.id]=planetForecast(p,body,vocab);
    const housePredictions={};for(let h=1;h<=12;h++)housePredictions[h]=houseForecast(h,body,vocab);
    return res.status(200).json({summary:summaryForecast(body,planetPredictions),planetPredictions,housePredictions,destinationZone:body.destinationZone||{},transitNatalAspects:body.transitNatalAspects||[],modelVersion:'event-karaka-route-4'});
  }catch(e){return res.status(500).json({error:'Interpretation failed'})}
}
