import { useEffect, useRef } from 'react';
import { ZODIAC_GLYPHS, NAKSHATRAS, calculateAspects, formatDistance } from '../lib/astro';

const GOLD='#F4C842';
const norm=n=>((n%360)+360)%360;
const rad=d=>d*Math.PI/180;

const ASPECT_STYLE={
  Conjunction:{color:'rgba(244,200,66,.56)',dash:[]},
  Sextile:{color:'rgba(94,234,212,.50)',dash:[3,5]},
  Square:{color:'rgba(248,113,113,.56)',dash:[]},
  Trine:{color:'rgba(96,165,250,.52)',dash:[]},
  Quincunx:{color:'rgba(192,132,252,.46)',dash:[4,5]},
  Opposition:{color:'rgba(251,146,60,.56)',dash:[]}
};

export default function ZodiacWheel({
  chart,
  planets=[],
  selectedPlanet,
  onSelectPlanet,
  destination=null,
  compact=false,
  overlay=false,
  radiusMeters=null,
  distanceUnit='ft'
}) {
  const ref=useRef(null);
  const size=compact?420:500;

  useEffect(()=>{
    const c=ref.current;
    if(!c||!chart)return;
    const ctx=c.getContext('2d');
    const W=c.width,H=c.height,cx=W/2,cy=H/2;
    const R=Math.min(W,H)/2-28;
    ctx.clearRect(0,0,W,H);

    // ASC is fixed to East/right. Map zoom/radius never changes this rotation.
    const rotation=90-chart.asc;
    const point=(lon,r)=>{
      const screen=norm(lon+rotation);
      const a=rad(screen-90);
      return [cx+r*Math.cos(a),cy+r*Math.sin(a)];
    };

    const alpha=overlay?.58:1;

    // Thin outer compass rim.
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
    ctx.strokeStyle=`rgba(244,200,66,${0.7*alpha})`;ctx.lineWidth=1.4;ctx.stroke();

    // Zodiac ring — smaller symbols, fine edges, transparent enough for streets below.
    const zodiacOuter=R;
    const zodiacInner=R*.84;
    for(let i=0;i<12;i++){
      const s=rad(i*30+rotation-90);
      const e=rad((i+1)*30+rotation-90);
      ctx.beginPath();ctx.arc(cx,cy,zodiacOuter,s,e);ctx.arc(cx,cy,zodiacInner,e,s,true);ctx.closePath();
      ctx.fillStyle=overlay
        ? (i%2?'rgba(7,10,28,.22)':'rgba(7,10,28,.12)')
        : (i%2?'rgba(12,16,42,.92)':'rgba(7,10,28,.92)');
      ctx.fill();
      ctx.strokeStyle=`rgba(244,200,66,${.27*alpha})`;ctx.lineWidth=.8;ctx.stroke();
      const [x,y]=point(i*30+15,(zodiacOuter+zodiacInner)/2);
      ctx.font=compact?'15px serif':'19px serif';
      ctx.fillStyle=`rgba(244,200,66,${.95*alpha})`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(ZODIAC_GLYPHS[i],x,y);
    }

    // Nakshatra ring — all 27 divisions visible on map and compass modes.
    const nakOuter=zodiacInner-2;
    const nakInner=R*.66;
    const step=360/27;
    for(let i=0;i<27;i++){
      const s=rad(i*step+rotation-90);
      const e=rad((i+1)*step+rotation-90);
      ctx.beginPath();ctx.arc(cx,cy,nakOuter,s,e);ctx.arc(cx,cy,nakInner,e,s,true);ctx.closePath();
      ctx.fillStyle=overlay?'rgba(8,12,30,.09)':(i%2?'rgba(200,216,232,.025)':'rgba(244,200,66,.018)');
      ctx.fill();
      ctx.strokeStyle=`rgba(210,222,235,${.22*alpha})`;ctx.lineWidth=.55;ctx.stroke();

      const short=NAKSHATRAS[i]
        .replace('Purva ','P. ')
        .replace('Uttara ','U. ')
        .replace('Bhadrapada','Bhadra')
        .replace('Phalguni','Phalg.')
        .replace('Ashadha','Ash.')
        .slice(0,8);
      const [x,y]=point(i*step+step/2,(nakOuter+nakInner)/2);
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(rad(norm(i*step+step/2+rotation)));
      ctx.font=compact?'6px Inter, sans-serif':'7px Inter, sans-serif';
      ctx.fillStyle=`rgba(230,235,244,${.84*alpha})`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(short,0,0);
      ctx.restore();
    }

    // House ring.
    const houseOuter=nakInner-2;
    const houseInner=R*.49;
    for(let h=0;h<12;h++){
      const cusp=chart.houseCusps[h];
      const s=rad(cusp+rotation-90);
      const e=rad(cusp+30+rotation-90);
      ctx.beginPath();ctx.arc(cx,cy,houseOuter,s,e);ctx.arc(cx,cy,houseInner,e,s,true);ctx.closePath();
      ctx.fillStyle=overlay?'rgba(8,12,30,.05)':(h%2?'rgba(255,255,255,.018)':'rgba(255,255,255,.03)');
      ctx.fill();
      ctx.strokeStyle=h%3===0?`rgba(244,200,66,${.36*alpha})`:`rgba(210,222,235,${.16*alpha})`;
      ctx.lineWidth=h%3===0?.9:.5;ctx.stroke();
      const [x,y]=point(cusp+15,(houseOuter+houseInner)/2);
      ctx.font=compact?'7px Inter, sans-serif':'bold 9px Inter, sans-serif';
      ctx.fillStyle=`rgba(235,240,248,${.76*alpha})`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(`${h+1}`,x,y);
    }

    // Transparent center for city/street visibility.
    ctx.beginPath();ctx.arc(cx,cy,houseInner-1,0,Math.PI*2);
    ctx.fillStyle=overlay?'rgba(6,9,26,.07)':'rgba(6,9,26,.94)';ctx.fill();

    // Sidereal aspect lines inside the center, based only on exact sidereal longitudes.
    const aspectRadius=houseInner-28;
    const byId=new Map(planets.map(p=>[p.id,p]));
    calculateAspects(planets).forEach(a=>{
      const pa=byId.get(a.aId),pb=byId.get(a.bId);
      if(!pa||!pb)return;
      const [x1,y1]=point(pa.siderealLon,aspectRadius);
      const [x2,y2]=point(pb.siderealLon,aspectRadius);
      const style=ASPECT_STYLE[a.type]||ASPECT_STYLE.Sextile;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
      ctx.strokeStyle=style.color;ctx.globalAlpha=overlay?.75:1;
      ctx.lineWidth=a.orb<1?1.6:1;
      ctx.setLineDash(style.dash);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    });

    // Planet glyphs at their exact sidereal longitudes / transiting nakshatra positions.
    const pr=houseInner-15;
    const occupied=[];
    planets.forEach(p=>{
      if(!Number.isFinite(p.siderealLon))return;
      let ring=pr;
      const close=occupied.some(o=>Math.abs(((o-p.siderealLon+540)%360)-180)<4.5);
      if(close) ring-=17;
      occupied.push(p.siderealLon);
      const [x,y]=point(p.siderealLon,ring);
      const selected=selectedPlanet?.id===p.id;
      if(selected){ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fillStyle='rgba(244,200,66,.15)';ctx.fill();}
      ctx.font=compact?(selected?'16px serif':'13px serif'):(selected?'19px serif':'16px serif');
      ctx.fillStyle=selected?GOLD:`rgba(244,200,66,${overlay?.94:.92})`;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.glyph,x,y);
    });

    // Cardinal compass markers. East/right remains the astronomical ASC anchor.
    const compass=[['N',0],['E',90],['S',180],['W',270]];
    compass.forEach(([label,deg])=>{
      const a=rad(deg-90), rr=R+13;
      const x=cx+rr*Math.cos(a),y=cy+rr*Math.sin(a);
      ctx.font=compact?'bold 10px Inter, sans-serif':'bold 11px Inter, sans-serif';
      ctx.fillStyle=`rgba(244,200,66,${.9*alpha})`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y);
    });

    const ascR=houseInner-2;
    const [ux,uy]=point(chart.asc,ascR);
    ctx.beginPath();ctx.arc(ux,uy,compact?5:7,0,Math.PI*2);ctx.fillStyle='#3b82f6';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
    if(!compact){ctx.font='bold 9px Inter, sans-serif';ctx.fillStyle='#8ec5ff';ctx.textAlign='left';ctx.fillText('ASC · YOU',ux+10,uy);}

    if(destination){
      const dsc=norm(chart.asc+180);const [dx,dy]=point(dsc,ascR);
      ctx.beginPath();ctx.arc(dx,dy,compact?5:7,0,Math.PI*2);ctx.fillStyle=GOLD;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.moveTo(ux,uy);ctx.lineTo(dx,dy);ctx.strokeStyle='rgba(244,200,66,.30)';ctx.lineWidth=1;ctx.setLineDash([4,6]);ctx.stroke();ctx.setLineDash([]);
      if(!compact){ctx.font='bold 9px Inter, sans-serif';ctx.fillStyle=GOLD;ctx.textAlign='right';ctx.fillText('DEST · DSC',dx-10,dy);}
    }

    if(overlay && Number.isFinite(radiusMeters)){
      ctx.font='bold 10px Inter, sans-serif';ctx.fillStyle='rgba(255,255,255,.88)';ctx.textAlign='center';
      ctx.fillText(`RADIUS ${formatDistance(radiusMeters/1000,distanceUnit).toUpperCase()}`,cx,H-8);
    }
  },[chart,planets,selectedPlanet,destination,compact,overlay,radiusMeters,distanceUnit]);

  const onClick=e=>{
    if(!chart||!onSelectPlanet)return;
    const rect=ref.current.getBoundingClientRect();
    const x=(e.clientX-rect.left)*(ref.current.width/rect.width);
    const y=(e.clientY-rect.top)*(ref.current.height/rect.height);
    const cx=ref.current.width/2,cy=ref.current.height/2;
    const screen=norm(Math.atan2(y-cy,x-cx)*180/Math.PI+90);
    const lon=norm(screen-(90-chart.asc));
    let nearest=null,gap=999;
    planets.forEach(p=>{const d=Math.abs(((p.siderealLon-lon+540)%360)-180);if(d<gap){gap=d;nearest=p;}});
    if(nearest&&gap<12)onSelectPlanet(nearest);
  };

  return (
    <div className={overlay?'clean-wheel overlay-wheel':'clean-wheel'}>
      <canvas ref={ref} width={size} height={size} onClick={onClick} className={compact?'wheel-canvas compact':'wheel-canvas'} />
      {!compact && <div className="wheel-key"><span><i className="you-dot"/>ASC / current position</span><span><i className="dest-dot"/>Mission DSC / destination</span></div>}
    </div>
  );
}
