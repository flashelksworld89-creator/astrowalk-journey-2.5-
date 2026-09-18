import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/googleMaps';

export default function GoogleMissionMap({location,analysisLocation,destination,fullscreen,radiusMeters=152.4,followUser=true}) {
  const el=useRef(null),mapRef=useRef(null),mapsRef=useRef(null),userMarkerRef=useRef(null),analysisMarkerRef=useRef(null),destMarkerRef=useRef(null),routeRef=useRef(null),scaleCircleRef=useRef(null),initialized=useRef(false);
  const [error,setError]=useState('');

  const fitScale=()=>{const map=mapRef.current,circle=scaleCircleRef.current;if(!map||!circle)return;const bounds=circle.getBounds?.();if(bounds)map.fitBounds(bounds,fullscreen?90:65)};

  useEffect(()=>{
    let cancelled=false;
    loadGoogleMaps().then(maps=>{
      if(cancelled||!el.current||initialized.current)return;
      mapsRef.current=maps;
      const map=new maps.Map(el.current,{center:location,zoom:17,mapTypeId:'roadmap',streetViewControl:true,fullscreenControl:false,mapTypeControl:true,clickableIcons:true});
      mapRef.current=map;initialized.current=true;
      scaleCircleRef.current=new maps.Circle({center:location,radius:radiusMeters,map,strokeColor:'#F4C842',strokeOpacity:.42,strokeWeight:1.5,fillColor:'#F4C842',fillOpacity:.018,clickable:false});
      userMarkerRef.current=new maps.Marker({position:location,map,title:'Live device position',zIndex:30,icon:{path:maps.SymbolPath.CIRCLE,scale:8,fillColor:'#2563eb',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:2}});
      analysisMarkerRef.current=new maps.Marker({position:analysisLocation||location,map,title:'Astrology calculation position',zIndex:25,icon:{path:maps.SymbolPath.CIRCLE,scale:4,fillColor:'#F4C842',fillOpacity:.9,strokeColor:'#171717',strokeWeight:1}});
      if(destination){destMarkerRef.current=new maps.Marker({position:destination,map,title:'Destination'});routeRef.current=new maps.Polyline({path:[location,destination],map,geodesic:true,strokeColor:'#ffffff',strokeOpacity:.72,strokeWeight:3});}
      setTimeout(fitScale,40);setError('');
    }).catch(e=>!cancelled&&setError(e.message||'Google Maps failed to load.'));
    return()=>{cancelled=true};
  },[]);

  useEffect(()=>{
    if(!mapRef.current||!location)return;
    userMarkerRef.current?.setPosition(location);
    scaleCircleRef.current?.setCenter(location);
    if(routeRef.current&&destination)routeRef.current.setPath([location,destination]);
    if(followUser)mapRef.current.panTo(location);
  },[location?.lat,location?.lng,followUser,destination?.lat,destination?.lng]);

  useEffect(()=>{if(!analysisLocation)return;analysisMarkerRef.current?.setPosition(analysisLocation)},[analysisLocation?.lat,analysisLocation?.lng]);

  useEffect(()=>{const circle=scaleCircleRef.current;if(!circle)return;circle.setRadius(Math.max(15,Number(radiusMeters)||152.4));const id=setTimeout(fitScale,30);return()=>clearTimeout(id)},[radiusMeters,fullscreen]);

  useEffect(()=>{if(!mapRef.current)return;const id=setTimeout(()=>{window.google?.maps?.event?.trigger(mapRef.current,'resize');fitScale()},60);return()=>clearTimeout(id)},[fullscreen]);

  return <div className="google-map-shell">{error?<div className="map-error">{error}</div>:null}<div ref={el} className="google-map"/></div>;
}
