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
  const [view,setView]=useState('map'),[mapFullscreen,setMapFullscreen]=useState(false),[date,setDate]=useState(new Date(mission.date)),[live,setLive]=useState(()=>Math.abs(new Date(mission.date).getTime()-Date.now())<5*60*1000),[trackingMode,setTrackingMode]=useState(initialMode),[liveLocation,setLiveLocation]=useState(initialMode==='static'?mission.location:(gps||mission.location)),[analysisLocation,setAnalysisLocation]=useState(mission.location),[chart,setChart]=useState(null),[natalChart,setNatalChart]=useState(null),[selected,setSelected]=useState(null),[selectedHouse,setSelectedHouse]=useState(null),[loadingChart,setLoadingChart]=useState(true),[privateReading,setPrivateReading]=useState(null),[privateReadingBusy,setPrivateReadingBusy]=useState(false),[wheelRadiusMeters,setWheelRadiusMeters]=useState(initialMode==='drive'?1609.344:152.4),[distanceUnit,setDistanceUnit]=useState(initialMode==='drive'?'mi':'ft'),[movedMeters,setMovedMeters]=useState(0),[lastAnalysisAt,setLastAnalysisAt]=useState(Date.now());
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

  useEffect(()=>{let cancelled=false;setLoadingChart(true);computeChart(date,analysisLocation.lat,analysisLocation.lng).then(next=>{if(!cancelled){setChart(next);setSelected(prev=>prev?next.planets.find(p=>p.id===prev.id)||null:null)}}).finally(()=>!cancelled&&setLoadingChart(false));return()=>{cancelled=true}},[date,analysisLocation.lat,analysisLocation.lng]);
  useEffect(()=>{let cancelled=false;const p=mission.profile;computeNatalChart(p.birthDate,p.birthTime,p.birthLat,p.birthLng,p.birthUtcOffset).then(n=>{if(!cancelled)setNatalChart(n)});return()=>{cancelled=true}},[mission.profile]);

  const planets=chart?.planets||[],natalPlanets=natalChart?.planets||[];
  const houseLords=useMemo(()=>calculateHouseLords(natalPlanets,natalChart?.asc),[natalPlanets,natalChart?.asc]);
  const baseReading=useMemo(()=>buildJourneyReading({origin:analysisLocation,destination:mission.destination,transitPlanets:planets,natalPlanets,houseLords,selectedDate:date}),[analysisLocation,mission.destination,planets,natalPlanets,houseLords,date]);
  const bearing=useMemo(()=>bearingBetween(analysisLocation,mission.destination),[analysisLocation,mission.destination]);
  const destinationZone=useMemo(()=>chart?destinationZoneFromBearing(chart,bearing):null,[chart,bearing]);

  useEffect(()=>{if(!chart||!natalChart||!baseReading)return;let cancelled=false;setPrivateReadingBusy(true);requestPrivateInterpretation({chart,natalChart,houseLords,origin:analysisLocation,destination:mission.destination,bearing:baseReading.bearing,direction:baseReading.direction,distanceKm:baseReading.distanceKm,selectedDate:date}).then(r=>!cancelled&&setPrivateReading(r)).catch(()=>!cancelled&&setPrivateReading(null)).finally(()=>!cancelled&&setPrivateReadingBusy(false));return()=>{cancelled=true}},[chart,natalChart,baseReading,houseLords,analysisLocation,mission.destination,date]);

  const reading=useMemo(()=>!baseReading?null:!privateReading?baseReading:{...baseReading,summary:privateReading.summary,privateModelVersion:privateReading.modelVersion},[baseReading,privateReading]);
  const focusForecast=selected?privateReading?.planetPredictions?.[selected.id]:selectedHouse?privateReading?.housePredictions?.[selectedHouse]:null;
  const focusTitle=selected?`${selected.glyph} ${selected.name} forecast`:selectedHouse?`House ${selectedHouse} · ${HOUSE_MEANINGS[selectedHouse]?.name||''}`:'Select a planet or house';
  const choosePlanet=p=>{setSelected(p);setSelectedHouse(null)};const chooseHouse=h=>{setSelectedHouse(h);setSelected(null)};

  return <div className={mapFullscreen?'mission-page map-is-fullscreen':'mission-page'}>
    {!mapFullscreen&&<><header className="mission-header"><button onClick={onBack} className="back-button"><ArrowLeft size={16}/> Setup</button><div><h1>AstroWalk Journey</h1><p>{mission.destination.label}</p></div></header><TimeNavigator date={date} live={live} onLive={()=>{setLive(true);setDate(new Date())}} onChange={d=>{if(!Number.isNaN(d.getTime())){setLive(false);setDate(d)}}}/>{reading&&<section className="card destination-reading"><div className="section-title"><Sparkles size={14}/> Journey forecast <span>{destinationZone?`Destination zone: House ${destinationZone.house}`:''}</span></div>{natalChart&&<div className="natal-loaded"><span className="natal-asc-dot"/><b>Natal chart loaded</b><span>ASC {getSignData(natalChart.asc).label}</span></div>}<p>{reading.summary}</p>{privateReadingBusy&&<div className="small-note">Combining natal chart, live transit, route zone and private terminology…</div>}</section>}<div className="mission-tabs"><button className={view==='compass'?'active':''} onClick={()=>setView('compass')}><Compass size={16}/> Compass</button><button className={view==='map'?'active':''} onClick={()=>setView('map')}><Map size={16}/> Map</button></div><PlanetStrip planets={planets} selected={selected} onSelect={choosePlanet}/></>}
    {loadingChart&&!chart?<section className="card loading-chart"><Loader2 className="spin" size={20}/> Calculating sidereal charts…</section>:null}
    {view==='compass'&&!mapFullscreen&&chart&&<div className="layout main"><section className="wheel-card"><ZodiacWheel chart={chart} natalAsc={natalChart?.asc} planets={planets} selectedPlanet={selected} onSelectPlanet={choosePlanet} selectedHouse={selectedHouse} onSelectHouse={chooseHouse} destinationBearing={bearing}/></section><div className="stack"><LiveTrackingControls mode={trackingMode} onModeChange={changeTrackingMode} gps={gps} gpsError={gpsError} movedMeters={movedMeters} lastAnalysisAt={lastAnalysisAt}/><section className="card prediction-focus"><div className="section-title">{focusTitle}</div><ForecastPanel forecast={focusForecast} fallback="Click any planetary glyph or numbered house sector on the wheel. The panel will show possible events, people/roles, constructive and challenging expressions, and the natal/transit triggers behind the forecast."/></section><OutcomeFeedback reading={reading}/></div></div>}
    {view==='map'&&<div className={mapFullscreen?'fullscreen-map-wrap':'mission-map-wrap'}><GoogleMissionMap location={liveLocation} analysisLocation={analysisLocation} destination={mission.destination} fullscreen={mapFullscreen} radiusMeters={wheelRadiusMeters} followUser={trackingMode!=='static'}/><MapScaleControls radiusMeters={wheelRadiusMeters} unit={distanceUnit} onUnitChange={setDistanceUnit} onRadiusChange={setWheelRadiusMeters}/><div className="map-tracking-overlay"><LiveTrackingControls mode={trackingMode} onModeChange={changeTrackingMode} gps={gps} gpsError={gpsError} movedMeters={movedMeters} lastAnalysisAt={lastAnalysisAt}/></div><button className="fullscreen-button" onClick={()=>setMapFullscreen(v=>!v)}>{mapFullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>} {mapFullscreen?'Exit full screen':'Full screen'}</button>{chart&&<div className="map-wheel-overlay"><ZodiacWheel chart={chart} natalAsc={natalChart?.asc} planets={planets} selectedPlanet={selected} onSelectPlanet={choosePlanet} selectedHouse={selectedHouse} onSelectHouse={chooseHouse} destinationBearing={bearing} compact overlay radiusMeters={wheelRadiusMeters} distanceUnit={distanceUnit}/></div>}</div>}
    {view==='map'&&!mapFullscreen&&<div className="layout main under-map"><section className="card prediction-focus"><div className="section-title">{focusTitle}</div><ForecastPanel forecast={focusForecast} fallback="Click a planet glyph or numbered house zone on the compass overlay to open its event forecast."/></section><OutcomeFeedback reading={reading}/></div>}
  </div>;
}
