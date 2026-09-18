import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Compass, Map, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import ZodiacWheel from './ZodiacWheel';
import GoogleMissionMap from './GoogleMissionMap';
import PlanetStrip from './PlanetStrip';
import PlanetDetails from './PlanetDetails';
import HouseLords from './HouseLords';
import OutcomeFeedback from './OutcomeFeedback';
import TimeNavigator from './TimeNavigator';
import MapScaleControls from './MapScaleControls';
import {
  computeChart,
  computeNatalChart,
  calculateHouseLords,
  buildJourneyReading
} from '../lib/astro';
import { requestPrivateInterpretation } from '../lib/privateInterpretation';

export default function MissionView({ mission, gps, onBack }) {
  const [view,setView]=useState('compass');
  const [mapFullscreen,setMapFullscreen]=useState(false);
  const [date,setDate]=useState(new Date(mission.date));
  const [live,setLive]=useState(false);
  const [location,setLocation]=useState(mission.location);
  const [chart,setChart]=useState(null);
  const [natalChart,setNatalChart]=useState(null);
  const [selected,setSelected]=useState(null);
  const [loadingChart,setLoadingChart]=useState(true);
  const [privateReading,setPrivateReading]=useState(null);
  const [privateReadingBusy,setPrivateReadingBusy]=useState(false);
  const [wheelRadiusMeters,setWheelRadiusMeters]=useState(152.4); // 500 ft walking default
  const [distanceUnit,setDistanceUnit]=useState('ft');

  useEffect(()=>{
    if(gps && !mission.location?.manual) setLocation(gps);
  },[gps]);

  useEffect(()=>{
    if(!live)return;
    const id=setInterval(()=>setDate(new Date()),30000);
    return()=>clearInterval(id);
  },[live]);

  useEffect(()=>{
    let cancelled=false;
    setLoadingChart(true);
    computeChart(date,location.lat,location.lng)
      .then(next=>{
        if(cancelled)return;
        setChart(next);
        setSelected(prev=>prev ? next.planets.find(p=>p.id===prev.id)||null : null);
      })
      .finally(()=>!cancelled&&setLoadingChart(false));
    return()=>{cancelled=true};
  },[date,location.lat,location.lng]);

  useEffect(()=>{
    let cancelled=false;
    const p=mission.profile;
    computeNatalChart(p.birthDate,p.birthTime,p.birthLat,p.birthLng)
      .then(n=>{if(!cancelled)setNatalChart(n)});
    return()=>{cancelled=true};
  },[mission.profile]);

  const planets=chart?.planets||[];
  const natalPlanets=natalChart?.planets||[];

  const houseLords=useMemo(
    ()=>calculateHouseLords(natalPlanets,natalChart?.asc),
    [natalPlanets,natalChart?.asc]
  );

  const baseReading=useMemo(()=>buildJourneyReading({
    origin:location,
    destination:mission.destination,
    transitPlanets:planets,
    natalPlanets,
    houseLords,
    selectedDate:date
  }),[location,mission.destination,planets,natalPlanets,houseLords,date]);

  useEffect(()=>{
    if(!chart||!baseReading)return;
    let cancelled=false;
    setPrivateReadingBusy(true);
    requestPrivateInterpretation({
      chart,
      origin:location,
      destination:mission.destination,
      bearing:baseReading.bearing,
      direction:baseReading.direction,
      distanceKm:baseReading.distanceKm,
      selectedDate:date
    }).then(result=>{
      if(!cancelled)setPrivateReading(result);
    }).catch(()=>{
      if(!cancelled)setPrivateReading(null);
    }).finally(()=>{
      if(!cancelled)setPrivateReadingBusy(false);
    });
    return()=>{cancelled=true};
  },[chart,baseReading,location,mission.destination,date]);

  const reading=useMemo(()=>{
    if(!baseReading)return null;
    if(!privateReading)return baseReading;
    return {
      ...baseReading,
      summary:`${baseReading.summary} ${privateReading.summary}`,
      privateModelVersion:privateReading.modelVersion,
      privatePrimary:privateReading.primary,
      selectedThemes:privateReading.selectedThemes||[]
    };
  },[baseReading,privateReading]);

  return (
    <div className={mapFullscreen?'mission-page map-is-fullscreen':'mission-page'}>
      {!mapFullscreen&&<>
        <header className="mission-header">
          <button onClick={onBack} className="back-button"><ArrowLeft size={16}/> Setup</button>
          <div>
            <h1>Mission View</h1>
            <p>{mission.destination.label}</p>
          </div>
        </header>

        <TimeNavigator
          date={date}
          live={live}
          onLive={()=>{setLive(true);setDate(new Date())}}
          onChange={d=>{if(!Number.isNaN(d.getTime())){setLive(false);setDate(d)}}}
        />

        {reading&&<section className="card destination-reading">
          <div className="section-title">Destination interpretation</div>
          <p>{reading.summary}</p>
          {privateReadingBusy&&<div className="small-note">Refining journey themes…</div>}
        </section>}

        <div className="mission-tabs">
          <button className={view==='compass'?'active':''} onClick={()=>setView('compass')}><Compass size={16}/> Compass</button>
          <button className={view==='map'?'active':''} onClick={()=>setView('map')}><Map size={16}/> Map</button>
        </div>

        <PlanetStrip planets={planets} selected={selected} onSelect={setSelected}/>
      </>}

      {loadingChart && !chart ? (
        <section className="card loading-chart"><Loader2 className="spin" size={20}/> Calculating Swiss Ephemeris chart…</section>
      ) : null}

      {view==='compass'&&!mapFullscreen&&chart&&(
        <div className="layout main">
          <section className="wheel-card">
            <ZodiacWheel
              chart={chart}
              planets={planets}
              selectedPlanet={selected}
              onSelectPlanet={setSelected}
              destination={mission.destination}
            />
          </section>
          <div className="stack">
            <PlanetDetails planet={selected} houseLords={houseLords}/>
            <HouseLords lords={houseLords}/>
            <OutcomeFeedback reading={reading}/>
          </div>
        </div>
      )}

      {view==='map'&&(
        <div className={mapFullscreen?'fullscreen-map-wrap':'mission-map-wrap'}>
          <GoogleMissionMap
            location={location}
            destination={mission.destination}
            planets={planets}
            selectedPlanet={selected}
            onSelectPlanet={setSelected}
            fullscreen={mapFullscreen}
            radiusMeters={wheelRadiusMeters}
          />
          <MapScaleControls
            radiusMeters={wheelRadiusMeters}
            unit={distanceUnit}
            onUnitChange={setDistanceUnit}
            onRadiusChange={setWheelRadiusMeters}
          />
          <button className="fullscreen-button" onClick={()=>setMapFullscreen(v=>!v)}>
            {mapFullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>}
            {mapFullscreen?'Exit full screen':'Full screen'}
          </button>

          {chart&&(
            <div className="map-wheel-overlay">
              <ZodiacWheel
                chart={chart}
                planets={planets}
                selectedPlanet={selected}
                onSelectPlanet={setSelected}
                destination={mission.destination}
                compact
                overlay
                radiusMeters={wheelRadiusMeters}
                distanceUnit={distanceUnit}
              />
            </div>
          )}
        </div>
      )}

      {view==='map'&&!mapFullscreen&&(
        <div className="layout main under-map">
          <PlanetDetails planet={selected} houseLords={houseLords}/>
          <OutcomeFeedback reading={reading}/>
        </div>
      )}
    </div>
  );
}
