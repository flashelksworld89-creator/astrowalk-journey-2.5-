import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Compass, Map, Maximize2, Minimize2, Loader2, Sparkles } from 'lucide-react';
import ZodiacWheel from './ZodiacWheel';
import GoogleMissionMap from './GoogleMissionMap';
import PlanetStrip from './PlanetStrip';
import OutcomeFeedback from './OutcomeFeedback';
import TimeNavigator from './TimeNavigator';
import MapScaleControls from './MapScaleControls';
import LiveTrackingControls from './LiveTrackingControls';
import {computeChart,computeNatalChart,calculateHouseLords,buildJourneyReading,bearingBetween,destinationZoneFromBearing,distanceKmBetween,HOUSE_MEANINGS,getSignData} from '../lib/astro';
import { requestPrivateInterpretation } from '../lib/privateInterpretation';


function ForecastPanel({forecast,fallback}){
  if(!forecast)return <p>{fallback}</p>;
  return <div className="forecast-detail">
    <p className="forecast-headline">{forecast.headline}</p>
    <div className="forecast-grid"><div><b>What may happen</b><p>{forecast.eventText}</p></div><div><b>People / roles</b><p>{forecast.peopleText}</p></div><div className="forecast-positive"><b>Constructive expression</b><p>{forecast.positiveText}</p></div><div className="forecast-challenge"><b>Challenging expression</b><p>{forecast.challengingText}</p></div></div>
    <p className="forecast-destination">{forecast.destinationText}</p>
    {!!forecast.triggers?.length&&<details><summary>Why this forecast was generated</summary><ul>{forecast.triggers.map((t,i)=><li key={i}>{t}</li>)}</ul></details>}
  </div>;
}

const TRACKING = {
  walk:{movementMeters:12,maxSeconds:20},
  drive:{movementMeters:50,maxSeconds:30},
  static:{movementMeters:Infinity,maxSeconds:Infinity}
};

export default function MissionView({mission,gps,gpsError,onBack}){
  const initialMode=mission.trackingMode||((mission.originSource==='gps')?(mission.travelMode||'walk'):'static');
  const [view,setView]=useState('map'),[mapFullscreen,setMapFullscreen]=useState(false),[date,setDate]=useState(new Date(mission.date)),[live,setLive]=useState(()=>Math.abs(new Date(mission.date).getTime()-Date.now())<5*60*1000),[trackingMode,setTrackingMode]=useState(initialMode),[liveLocation,setLiveLocation]=useState(initialMode==='static'?mission.location:(gps||mission.location)),[analysisLocation,setAnalysisLocation]=useState(mission.location),[chart,setChart]=useState(null),[natalChart,setNatalChart]=useState(null),[selected,setSelected]=useState(null),[selectedHouse,setSelectedHouse]=useState(null),[loadingChart,setLoadingChart]=useState(true),[privateReading,setPrivateReading]=useState(null),[privateReadingBusy,setPrivateReadingBusy]=useState(false),[wheelRadiusMeters,setWheelRadiusMeters]=useState(initialMode==='drive'?1609.344:152.4),[distanceUnit,setDistanceUnit]=useState(initialMode==='drive'?'mi':'ft'),[movedMeters,setMovedMeters]=useState(0),[lastAnalysisAt,setLastAnalysisAt]=useState(Date.now()),[chartError,setChartError]=useState(''),[natalStatus,setNatalStatus]=useState('calculating'),[natalError,setNatalError]=useState('');
  const lastAnalysisRef=useRef({location:mission.location,at:Date.now()});

  useEffect(()=>{if(!live)return;const id=setInterval(()=>setDate(new Date()),30000);return()=>clearInterval(id)},[live]);

  useEffect(()=>{
    if(trackingMode==='static'||!gps)return;
    setLiveLocation(gps);
    const prior=lastAnalysisRef.current.location;
    const moved=(distanceKmBetween(prior,gps)||0)*1000;
    const elapsed=(Date.now()-lastAnalysisRef.current.at)/1000;
    setMovedMeters(moved);
    const rule=TRACKING[trackingMode]||TRACKING.walk;
    const accuracyOkay=!Number.isFinite(gps.accuracy)||gps.accuracy<=Math.max(75,rule.movementMeters*3);
    if(accuracyOkay&&(moved>=rule.movementMeters||elapsed>=rule.maxSeconds)){
      setAnalysisLocation(gps);
      lastAnalysisRef.current={location:gps,at:Date.now()};
      setLastAnalysisAt(Date.now());
      setMovedMeters(0);
    }
  },[gps,trackingMode]);

  const changeTrackingMode=mode=>{
    setTrackingMode(mode);
    if(mode==='static'){
      setLiveLocation(analysisLocation);
    } else if(gps){
      setLiveLocation(gps);
      setAnalysisLocation(gps);
      lastAnalysisRef.current={location:gps,at:Date.now()};
      setLastAnalysisAt(Date.now());
      setMovedMeters(0);
      if(mode==='walk'&&wheelRadiusMeters>804.672){setWheelRadiusMeters(152.4);setDistanceUnit('ft')}
      if(mode==='drive'&&wheelRadiusMeters<804.672){setWheelRadiusMeters(1609.344);setDistanceUnit('mi')}
    }
  };

  useEffect(()=>{let cancelled=false;setLoadingChart(true);setChartError('');computeChart(date,analysisLocation.lat,analysisLocation.lng).then(next=>{if(!cancelled){setChart(next);setSelected(prev=>prev?next.planets.find(p=>p.id===prev.id)||null:null)}}).catch(e=>{if(!cancelled){setChartError(e?.message||'Transit chart calculation failed.');setChart(null)}}).finally(()=>!cancelled&&setLoadingChart(false));return()=>{cancelled=true}},[date,analysisLocation.lat,analysisLocation.lng]);
  useEffect(()=>{let cancelled=false;const p=mission.profile;setNatalStatus('calculating');setNatalError('');setNatalChart(null);computeNatalChart(p.birthDate,p.birthTime,p.birthLat,p.birthLng,p.birthUtcOffset).then(n=>{if(!cancelled){if(!n?.planets?.length||!Number.isFinite(Number(n.asc)))throw new Error('Natal chart returned incomplete data.');setNatalChart(n);setNatalStatus('verified')}}).catch(e=>{if(!cancelled){setNatalStatus('error');setNatalError(e?.message||'Natal chart calculation failed.')}});return()=>{cancelled=true}},[mission.profile]);

  const planets=chart?.planets||[],natalPlanets=natalChart?.planets||[];
  const houseLords=useMemo(()=>calculateHouseLords(natalPlanets,natalChart?.asc),[natalPlanets,natalChart?.asc]);
  const baseReading=useMemo(()=>buildJourneyReading({origin:analysisLocation,destination:mission.destination,transitPlanets:planets,natalPlanets,houseLords,selectedDate:date}),[analysisLocation,mission.destination,planets,natalPlanets,houseLords,date]);
  const bearing=useMemo(()=>bearingBetween(analysisLocation,mission.destination),[analysisLocation,mission.destination]);
  const destinationZone=useMemo(()=>chart?destinationZoneFromBearing(chart,bearing):null,[chart,bearing]);

  useEffect(()=>{if(!chart||!natalChart||!baseReading)return;let cancelled=false;setPrivateReadingBusy(true);requestPrivateInterpretation({chart,natalChart,houseLords,origin:analysisLocation,destination:mission.destination,bearing:baseReading.bearing,direction:baseReading.direction,distanceKm:baseReading.distanceKm,selectedDate:date}).then(r=>!cancelled&&setPrivateReading(r)).catch(()=>!cancelled&&setPrivateReading(null)).finally(()=>!cancelled&&setPrivateReadingBusy(false));return()=>{cancelled=true}},[chart,natalChart,baseReading,houseLords,analysisLocation,mission.destination,date]);

  const reading=useMemo(()=>!baseReading?null:!privateReading?baseReading:{...baseReading,summary:privateReading.summary,privateModelVersion:privateReading.modelVersion},[baseReading,privateReading]);
  const natalSun=natalPlanets.find(p=>p.id==='sun'), natalMoon=natalPlanets.find(p=>p.id==='moon');
  const natalAudit=privateReading?.natalUsage||null;
  const focusForecast=selected?privateReading?.planetPredictions?.[selected.id]:selectedHouse?privateReading?.housePredictions?.[selectedHouse]:null;
  const focusTitle=selected?`${selected.glyph} ${selected.name} forecast`:selectedHouse?`House ${selectedHouse} · ${HOUSE_MEANINGS[selectedHouse]?.name||''}`:'Select a planet or house';
  const choosePlanet=p=>{setSelected(p);setSelectedHouse(null)};const chooseHouse=h=>{setSelectedHouse(h);setSelected(null)};

  return <div className={mapFullscreen?'mission-page map-is-fullscreen':'mission-page'}>
    {!mapFullscreen&&<><header className="mission-header"><button onClick={onBack} className="back-button"><ArrowLeft size={16}/> Setup</button><div><h1>AstroWalk Journey</h1><p>{mission.destination.label}</p></div></header><TimeNavigator date={date} live={live} onLive={()=>{setLive(true);setDate(new Date())}} onChange={d=>{if(!Number.isNaN(d.getTime())){setLive(false);setDate(d)}}}/><section className="card natal-verification"><div className="section-title">Natal chart verification <span>{natalStatus==='verified'?'ACTIVE':natalStatus==='error'?'ERROR':'CALCULATING'}</span></div>{natalStatus==='calculating'&&<div className="natal-status-line"><Loader2 className="spin" size={15}/> Calculating natal Ascendant, houses and planets…</div>}{natalStatus==='error'&&<div className="natal-error"><b>Natal chart was not generated.</b><span>{natalError}</span><span>Return to Setup and verify birth date, exact birth time, birthplace and UTC offset.</span></div>}{natalStatus==='verified'&&natalChart&&<><div className="natal-verified-head"><span className="natal-asc-dot"/><b>Natal chart verified and available to the prediction engine</b></div><div className="natal-proof-grid"><div><small>Natal ASC</small><b>{getSignData(natalChart.asc).label}</b></div><div><small>Natal Sun</small><b>{natalSun?`${natalSun.sign} ${natalSun.degree}°`:'—'}</b></div><div><small>Natal Moon</small><b>{natalMoon?`${natalMoon.sign} ${natalMoon.degree}°`:'—'}</b></div><div><small>Birth houses</small><b>{natalChart.houseCusps?.length||0} loaded</b></div></div>{natalAudit&&<div className="natal-used-audit"><b>Used in this prediction</b><span>{natalAudit.transitNatalAspectCount} transit→natal planet contacts</span><span>{natalAudit.transitNatalHouseAspectCount} transit→natal house contacts</span><span>{natalAudit.houseLordCount} natal house rulers</span></div>}</>}</section>{reading&&<section className="card destination-reading"><div className="section-title"><Sparkles size={14}/> Journey forecast <span>{destinationZone?`Destination zone: House ${destinationZone.house}`:''}</span></div><p>{reading.summary}</p>{privateReadingBusy&&<div className="small-note">Combining natal chart, live transit, route zone and private terminology…</div>}{natalStatus==='verified'&&!privateReadingBusy&&!natalAudit&&<div className="error">Natal chart is loaded, but the private interpretation response has not confirmed natal-data usage. Refresh or check the /api/interpret deployment.</div>}</section>}<div className="mission-tabs"><button className={view==='compass'?'active':''} onClick={()=>setView('compass')}><Compass size={16}/> Compass</button><button className={view==='map'?'active':''} onClick={()=>setView('map')}><Map size={16}/> Map</button></div><PlanetStrip planets={planets} selected={selected} onSelect={choosePlanet}/></>}
    {loadingChart&&!chart?<section className="card loading-chart"><Loader2 className="spin" size={20}/> Calculating sidereal transit chart…</section>:null}{chartError&&<section className="card error"><b>Transit compass could not be generated.</b> {chartError}</section>}
    {view==='compass'&&!mapFullscreen&&chart&&<div className="layout main"><section className="wheel-card"><ZodiacWheel chart={chart} natalAsc={natalChart?.asc} planets={planets} selectedPlanet={selected} onSelectPlanet={choosePlanet} selectedHouse={selectedHouse} onSelectHouse={chooseHouse} destinationBearing={bearing}/></section><div className="stack"><LiveTrackingControls mode={trackingMode} onModeChange={changeTrackingMode} gps={gps} gpsError={gpsError} movedMeters={movedMeters} lastAnalysisAt={lastAnalysisAt}/><section className="card prediction-focus"><div className="section-title">{focusTitle}</div><ForecastPanel forecast={focusForecast} fallback="Click any planetary glyph or numbered house sector on the wheel. The panel will show possible events, people/roles, constructive and challenging expressions, and the natal/transit triggers behind the forecast."/></section><OutcomeFeedback reading={reading}/></div></div>}
    {view==='map'&&<div className={mapFullscreen?'fullscreen-map-wrap':'mission-map-wrap'}><GoogleMissionMap location={liveLocation} analysisLocation={analysisLocation} destination={mission.destination} fullscreen={mapFullscreen} radiusMeters={wheelRadiusMeters} followUser={trackingMode!=='static'}/><MapScaleControls radiusMeters={wheelRadiusMeters} unit={distanceUnit} onUnitChange={setDistanceUnit} onRadiusChange={setWheelRadiusMeters}/><div className="map-tracking-overlay"><LiveTrackingControls mode={trackingMode} onModeChange={changeTrackingMode} gps={gps} gpsError={gpsError} movedMeters={movedMeters} lastAnalysisAt={lastAnalysisAt}/></div><button className="fullscreen-button" onClick={()=>setMapFullscreen(v=>!v)}>{mapFullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>} {mapFullscreen?'Exit full screen':'Full screen'}</button>{chart&&<div className="map-wheel-overlay"><div className="compass-overlay-label">LIVE SIDEREAL COMPASS</div><ZodiacWheel chart={chart} natalAsc={natalChart?.asc} planets={planets} selectedPlanet={selected} onSelectPlanet={choosePlanet} selectedHouse={selectedHouse} onSelectHouse={chooseHouse} destinationBearing={bearing} compact overlay radiusMeters={wheelRadiusMeters} distanceUnit={distanceUnit}/></div>}</div>}
    {view==='map'&&!mapFullscreen&&<div className="layout main under-map"><section className="card prediction-focus"><div className="section-title">{focusTitle}</div><ForecastPanel forecast={focusForecast} fallback="Click a planet glyph or numbered house zone on the compass overlay to open its event forecast."/></section><OutcomeFeedback reading={reading}/></div>}
  </div>;
}
