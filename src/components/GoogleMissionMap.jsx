import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/googleMaps';

export default function GoogleMissionMap({
  location,
  destination,
  fullscreen,
  radiusMeters=152.4
}) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const overlaysRef = useRef([]);
  const scaleCircleRef = useRef(null);
  const [error,setError] = useState('');

  const fitScale = () => {
    const map=mapRef.current;
    const circle=scaleCircleRef.current;
    if(!map||!circle)return;
    const bounds=circle.getBounds?.();
    if(bounds) map.fitBounds(bounds, fullscreen ? 90 : 65);
  };

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps().then(maps => {
      if (cancelled || !el.current) return;
      mapsRef.current=maps;

      const map = new maps.Map(el.current, {
        center: location,
        zoom: 17,
        mapTypeId: 'roadmap',
        streetViewControl: true,
        fullscreenControl: false,
        mapTypeControl: true,
        clickableIcons: true
      });
      mapRef.current = map;

      const scaleCircle = new maps.Circle({
        center: location,
        radius: radiusMeters,
        map,
        strokeColor: '#F4C842',
        strokeOpacity: 0.42,
        strokeWeight: 1.5,
        fillColor: '#F4C842',
        fillOpacity: 0.018,
        clickable: false
      });
      scaleCircleRef.current=scaleCircle;
      overlaysRef.current.push(scaleCircle);

      const userMarker = new maps.Marker({
        position: location,
        map,
        title: 'Current location / wheel center',
        zIndex: 20,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      overlaysRef.current.push(userMarker);

      if (destination) {
        const destinationMarker = new maps.Marker({
          position: destination,
          map,
          title: 'Destination'
        });
        overlaysRef.current.push(destinationMarker);

        const routeLine = new maps.Polyline({
          path: [location,destination],
          map,
          geodesic: true,
          strokeColor: '#ffffff',
          strokeOpacity: 0.72,
          strokeWeight: 3
        });
        overlaysRef.current.push(routeLine);
      }

      setTimeout(fitScale,40);
      setError('');
    }).catch(e => {
      if (!cancelled) setError(e.message || 'Google Maps failed to load.');
    });

    return () => {
      cancelled = true;
      overlaysRef.current.forEach(o => o.setMap?.(null));
      overlaysRef.current = [];
      scaleCircleRef.current=null;
      mapRef.current = null;
      mapsRef.current = null;
    };
  }, [location.lat,location.lng,destination?.lat,destination?.lng]);

  useEffect(()=>{
    const circle=scaleCircleRef.current;
    if(!circle)return;
    circle.setCenter(location);
    circle.setRadius(Math.max(15,Number(radiusMeters)||152.4));
    const id=setTimeout(fitScale,30);
    return()=>clearTimeout(id);
  },[radiusMeters,location.lat,location.lng,fullscreen]);

  useEffect(() => {
    if (!mapRef.current) return;
    const id = setTimeout(() => {
      window.google?.maps?.event?.trigger(mapRef.current,'resize');
      fitScale();
    }, 60);
    return () => clearTimeout(id);
  }, [fullscreen]);

  return (
    <div className="google-map-shell">
      {error ? <div className="map-error">{error}</div> : null}
      <div ref={el} className="google-map"/>
    </div>
  );
}
