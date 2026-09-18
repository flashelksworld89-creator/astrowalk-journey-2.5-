import { useEffect, useState } from 'react';
import MissionSetup from './components/MissionSetup';
import MissionView from './components/MissionView';

export default function App() {
  const [screen,setScreen] = useState('setup');
  const [mission,setMission] = useState(
    ()=>JSON.parse(localStorage.getItem('astrowalk_last_mission')||'null')
  );
  const [gps,setGps] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setGps({
        lat:pos.coords.latitude,
        lng:pos.coords.longitude,
        accuracy:pos.coords.accuracy,
        label:`GPS · ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
      }),
      ()=>{},
      {enableHighAccuracy:true,maximumAge:3000,timeout:15000}
    );
    return ()=>navigator.geolocation.clearWatch(id);
  },[]);

  const startMission = data => {
    localStorage.setItem('astrowalk_last_mission',JSON.stringify(data));
    setMission(data);
    setScreen('mission');
  };

  return (
    <div className="app">
      {screen==='setup' ? (
        <MissionSetup initial={mission} gps={gps} onStart={startMission}/>
      ) : (
        <MissionView mission={mission} gps={gps} onBack={()=>setScreen('setup')}/>
      )}
    </div>
  );
}
