import { useEffect, useRef } from 'react';
import { ZODIAC_GLYPHS, NAKSHATRAS, calculateAspects, formatDistance, destinationZoneFromBearing, getSignData } from '../lib/astro';

const GOLD='#F4C842';
const BLUE='#60A5FA';
const NATAL='#E879F9';
const norm=n=>((n%360)+360)%360;
const rad=d=>d*Math.PI/180;
const ASPECT_STYLE={
  Conjunction:['rgba(244,200,66,.66)',[]],
  Sextile:['rgba(94,234,212,.56)',[3,5]],
  Square:['rgba(248,113,113,.64)',[]],
  Trine:['rgba(96,165,250,.60)',[]],
  Quincunx:['rgba(192,132,252,.56)',[4,5]],
  Opposition:['rgba(251,146,60,.64)',[]]
};

export default function ZodiacWheel({
  chart,
  natalAsc=null,
  planets=[],
  selectedPlanet,
  onSelectPlanet,
  selectedHouse,
  onSelectHouse,
  destinationBearing=null,
  compact=false,
  overlay=false,
  radiusMeters=null,
  distanceUnit='ft'
}){
  const ref=useRef(null);
  const size=compact?620:620;

  useEffect(()=>{
    const c=ref.current;
    if(!c||!chart)return;
    const ctx=c.getContext('2d');
    const W=c.width,H=c.height,cx=W/2,cy=H/2;
    const R=Math.min(W,H)/2-42;
    ctx.clearRect(0,0,W,H);
    const rotation=90-chart.asc; // transiting ASC remains East/right.
    const point=(lon,r)=>{
      const a=rad(norm(lon+rotation)-90);
      return[cx+r*Math.cos(a),cy+r*Math.sin(a)];
    };
    const alpha=overlay?.90:1;

    // Fine compass bezel.
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
    ctx.strokeStyle=`rgba(244,200,66,${.86*alpha})`;ctx.lineWidth=1.15;ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,R-9,0,Math.PI*2);
    ctx.strokeStyle=`rgba(244,200,66,${.20*alpha})`;ctx.lineWidth=.55;ctx.stroke();
    for(let d=0;d<360;d+=2){
      const major=d%30===0,mid=d%10===0;
      const ro=R,ri=R-(major?13:mid?8:3.5),a=rad(d-90);
      ctx.beginPath();ctx.moveTo(cx+ri*Math.cos(a),cy+ri*Math.sin(a));ctx.lineTo(cx+ro*Math.cos(a),cy+ro*Math.sin(a));
      ctx.strokeStyle=`rgba(244,200,66,${(major?.72:mid?.44:.24)*alpha})`;ctx.lineWidth=major?1.05:.5;ctx.stroke();
    }

    // Zodiac ring.
    const zodiacOuter=R-15,zodiacInner=R*.835;
    for(let i=0;i<12;i++){
      const s=rad(i*30+rotation-90),e=rad((i+1)*30+rotation-90);
      ctx.beginPath();ctx.arc(cx,cy,zodiacOuter,s,e);ctx.arc(cx,cy,zodiacInner,e,s,true);ctx.closePath();
      ctx.fillStyle=overlay?(i%2?'rgba(5,8,24,.09)':'rgba(5,8,24,.025)'):(i%2?'rgba(12,16,42,.82)':'rgba(7,10,28,.82)');
      ctx.fill();ctx.strokeStyle=`rgba(244,200,66,${.28*alpha})`;ctx.lineWidth=.6;ctx.stroke();
      const[x,y]=point(i*30+15,(zodiacOuter+zodiacInner)/2);
      ctx.font=compact?'15px serif':'18px serif';ctx.fillStyle=`rgba(244,200,66,${.98*alpha})`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ZODIAC_GLYPHS[i],x,y);
    }

    // Nakshatra ring.
    const nakOuter=zodiacInner-2,nakInner=R*.665,step=360/27;
    for(let i=0;i<27;i++){
      const s=rad(i*step+rotation-90),e=rad((i+1)*step+rotation-90);
      ctx.beginPath();ctx.arc(cx,cy,nakOuter,s,e);ctx.arc(cx,cy,nakInner,e,s,true);ctx.closePath();
      ctx.fillStyle=overlay?'rgba(7,10,25,.018)':'rgba(255,255,255,.012)';ctx.fill();
      ctx.strokeStyle=`rgba(232,237,245,${.20*alpha})`;ctx.lineWidth=.45;ctx.stroke();
      const short=NAKSHATRAS[i].replace('Purva ','P. ').replace('Uttara ','U. ').replace('Bhadrapada','Bhadra').replace('Phalguni','Phalg.').replace('Ashadha','Ash.').slice(0,9);
      const[x,y]=point(i*step+step/2,(nakOuter+nakInner)/2);
      ctx.save();ctx.translate(x,y);ctx.rotate(rad(norm(i*step+step/2+rotation)));
      ctx.font=compact?'6.5px Inter, sans-serif':'7.5px Inter, sans-serif';ctx.fillStyle=`rgba(242,245,250,${.91*alpha})`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(short,0,0);ctx.restore();
    }

    // House ring.
    const houseOuter=nakInner-2,houseInner=R*.49;
    const zone=destinationZoneFromBearing(chart,Number(destinationBearing));
    for(let h=0;h<12;h++){
      const cusp=chart.houseCusps[h],s=rad(cusp+rotation-90),e=rad(cusp+30+rotation-90);
      const active=selectedHouse===h+1||zone?.house===h+1;
      ctx.beginPath();ctx.arc(cx,cy,houseOuter,s,e);ctx.arc(cx,cy,houseInner,e,s,true);ctx.closePath();
      ctx.fillStyle=active?`rgba(244,200,66,${overlay?.08:.12})`:overlay?'rgba(8,12,30,.012)':'rgba(255,255,255,.014)';ctx.fill();
      ctx.strokeStyle=active?`rgba(244,200,66,${.68*alpha})`:`rgba(230,237,247,${.15*alpha})`;ctx.lineWidth=active?1.05:.45;ctx.stroke();
      const[x,y]=point(cusp+15,(houseOuter+houseInner)/2);
      ctx.font=compact?'bold 8.5px Inter':'bold 10px Inter';ctx.fillStyle=active?GOLD:`rgba(245,248,252,${.82*alpha})`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(h+1),x,y);
    }

    // Very transparent center so map remains visible.
    ctx.beginPath();ctx.arc(cx,cy,houseInner-1,0,Math.PI*2);ctx.fillStyle=overlay?'rgba(3,6,18,.015)':'rgba(6,9,26,.88)';ctx.fill();

    // Transit-to-transit aspect geometry.
    const aspectRadius=houseInner-28,byId=new Map(planets.map(p=>[p.id,p]));
    calculateAspects(planets).forEach(a=>{
      const pa=byId.get(a.aId),pb=byId.get(a.bId);if(!pa||!pb)return;
      const[x1,y1]=point(pa.siderealLon,aspectRadius),[x2,y2]=point(pb.siderealLon,aspectRadius),st=ASPECT_STYLE[a.type]||ASPECT_STYLE.Sextile;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=st[0];ctx.globalAlpha=overlay?.72:1;ctx.lineWidth=a.orb<1?1.45:.8;ctx.setLineDash(st[1]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    });

    // Planet glyphs, separated slightly when crowded.
    const pr=houseInner-15,occupied=[];
    planets.forEach(p=>{
      if(!Number.isFinite(p.siderealLon))return;
      let ring=pr;
      const near=occupied.filter(o=>Math.abs(((o-p.siderealLon+540)%360)-180)<4.5).length;
      ring-=near*17;occupied.push(p.siderealLon);
      const[x,y]=point(p.siderealLon,ring),sel=selectedPlanet?.id===p.id;
      if(sel){ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fillStyle='rgba(244,200,66,.16)';ctx.fill();ctx.strokeStyle='rgba(244,200,66,.85)';ctx.lineWidth=1;ctx.stroke();}
      ctx.font=compact?(sel?'17px serif':'14.5px serif'):(sel?'20px serif':'17px serif');ctx.fillStyle=sel?'#FFF9D6':GOLD;ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=2;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.glyph,x,y);ctx.shadowBlur=0;
    });

    // Cardinal directions.
    [['N',0],['E',90],['S',180],['W',270]].forEach(([label,d])=>{
      const a=rad(d-90),rr=R+20,x=cx+rr*Math.cos(a),y=cy+rr*Math.sin(a);
      ctx.font=label==='E'?'bold 14px Inter':'bold 11px Inter';ctx.fillStyle=label==='E'?'#FFF7C2':GOLD;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y);
    });

    // Transiting ASC: always East/right because wheel rotates with current ASC.
    const transitR=houseOuter+7;
    const[tx,ty]=point(chart.asc,transitR);
    ctx.beginPath();ctx.arc(tx,ty,compact?5.5:6.5,0,Math.PI*2);ctx.fillStyle=BLUE;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.25;ctx.stroke();
    if(!compact){ctx.font='bold 8.5px Inter';ctx.fillStyle='#BFDBFE';ctx.textAlign='left';ctx.fillText(`TRANSIT ASC ${getSignData(chart.asc).label}`,tx+10,ty-1);}

    // Natal ASC: fixed natal zodiac degree plotted inside the current rotating transit wheel.
    if(Number.isFinite(Number(natalAsc))){
      const na=Number(natalAsc),[nx,ny]=point(na,transitR-19),sd=getSignData(na);
      const angle=rad(norm(na+rotation)-90);
      ctx.save();ctx.translate(nx,ny);ctx.rotate(angle+Math.PI/2);ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(6,6);ctx.lineTo(-6,6);ctx.closePath();ctx.fillStyle=NATAL;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=.9;ctx.stroke();ctx.restore();
      if(!compact){ctx.font='bold 8px Inter';ctx.fillStyle='#F5D0FE';ctx.textAlign=nx>=cx?'left':'right';ctx.fillText(`NATAL ASC ${sd.label}`,nx+(nx>=cx?10:-10),ny-1);}
    }

    // Destination bearing marker.
    if(zone){
      const[dx,dy]=point(zone.longitude,houseInner-2);ctx.beginPath();ctx.arc(dx,dy,compact?5.3:6.2,0,Math.PI*2);ctx.fillStyle=GOLD;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(dx,dy);ctx.strokeStyle='rgba(244,200,66,.38)';ctx.lineWidth=.8;ctx.setLineDash([4,6]);ctx.stroke();ctx.setLineDash([]);
    }

    if(overlay&&Number.isFinite(radiusMeters)){
      ctx.font='bold 9px Inter';ctx.fillStyle='rgba(255,255,255,.88)';ctx.textAlign='center';ctx.fillText(`RADIUS ${formatDistance(radiusMeters/1000,distanceUnit).toUpperCase()}`,cx,H-9);
    }
  },[chart,natalAsc,planets,selectedPlanet,selectedHouse,destinationBearing,compact,overlay,radiusMeters,distanceUnit]);

  const click=e=>{
    if(!chart)return;
    const rect=ref.current.getBoundingClientRect();
    const x=(e.clientX-rect.left)*(ref.current.width/rect.width),y=(e.clientY-rect.top)*(ref.current.height/rect.height);
    const cx=ref.current.width/2,cy=ref.current.height/2,R=Math.min(ref.current.width,ref.current.height)/2-42;
    const dist=Math.hypot(x-cx,y-cy),screen=norm(Math.atan2(y-cy,x-cx)*180/Math.PI+90),lon=norm(screen-(90-chart.asc));
    if(dist<R*.50){
      let nearest=null,gap=999;
      for(const p of planets){const d=Math.abs(((p.siderealLon-lon+540)%360)-180);if(d<gap){gap=d;nearest=p;}}
      if(nearest&&gap<11){onSelectPlanet?.(nearest);return;}
    }
    if(dist>=R*.49&&dist<=R*.665){const h=Math.floor(norm(lon-chart.asc)/30)+1;onSelectHouse?.(h);}
  };

  return <div className={overlay?'clean-wheel overlay-wheel':'clean-wheel'}>
    <canvas ref={ref} width={size} height={size} onClick={click} className={compact?'wheel-canvas compact':'wheel-canvas'} aria-label="Interactive sidereal compass. Blue circle is current transit Ascendant, pink triangle is natal Ascendant, gold glyphs are current transit planets. Click a planet glyph or house sector to read its forecast."/>
    {!compact&&<div className="wheel-key"><span><i className="transit-asc-dot"/>Transit ASC</span><span><i className="natal-asc-dot"/>Natal ASC</span><span><i className="dest-dot"/>Destination zone</span><span>Click planets or houses for forecasts</span></div>}
  </div>;
}
