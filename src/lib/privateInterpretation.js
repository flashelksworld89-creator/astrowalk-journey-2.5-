import { calculateAspects, aspectsForPlanet } from './astro';

export async function requestPrivateInterpretation({
  chart,
  origin,
  destination,
  bearing,
  direction,
  distanceKm,
  selectedDate
}) {
  if(!chart?.planets?.length) return null;
  const aspects=calculateAspects(chart.planets);
  const planets=chart.planets.map(p=>({
    id:p.id,
    name:p.name,
    sign:p.sign,
    degree:Number(p.degree),
    house:p.house,
    nakshatra:p.nakshatra?.name,
    pada:p.nakshatra?.pada,
    retrograde:p.retrograde,
    condition:p.condition?.label,
    conditionStrength:p.condition?.strength,
    aspects:aspectsForPlanet(p.id,aspects)
  }));

  const response=await fetch('/api/interpret',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      date:selectedDate?.toISOString?.()||String(selectedDate||''),
      origin:{lat:origin?.lat,lng:origin?.lng},
      destination:{lat:destination?.lat,lng:destination?.lng},
      bearing,direction,distanceKm,
      planets
    })
  });
  if(!response.ok) throw new Error('Private interpretation service unavailable');
  return response.json();
}
