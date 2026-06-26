// Turn-by-turn nav map (MapLibre GL JS + turf, in a WebView). Road-following route via
// OSRM; the REMAINING route stays highlighted (gold) while the TRAVELED part disappears as
// the courier moves; map follows GPS. Exposes setRoute() + updatePosition() to RN.
export const NAV_HTML = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet">
<script src="https://unpkg.com/@turf/turf@7.1.0/turf.min.js"></script>
<style>
  html,body,#map{height:100%;margin:0;background:#000;font-family:Inter,system-ui,sans-serif}
  #banner{position:absolute;top:12px;left:12px;right:12px;z-index:5;display:none;align-items:center;gap:12px;
    background:rgba(21,18,11,.92);border:1px solid #3a3220;border-radius:16px;padding:12px 14px;backdrop-filter:blur(10px);box-shadow:0 8px 30px rgba(0,0,0,.5)}
  #banner .ar{font-size:26px;color:#ffd277;line-height:1}
  #banner .tx{flex:1;color:#f6f1e6}
  #banner .ins{font-size:16px;font-weight:600}
  #banner .dst{font-size:12px;color:#a99f8b;font-family:monospace}
  .courier{width:30px;height:30px}
  .courier svg{filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))}
  .pin{width:22px;height:22px;border-radius:50% 50% 50% 2px;transform:rotate(45deg);border:2px solid #000;box-shadow:0 3px 8px rgba(0,0,0,.5)}
</style></head><body>
<div id="map"></div>
<div id="banner"><div class="ar" id="b-ar">↑</div><div class="tx"><div class="ins" id="b-ins">—</div><div class="dst" id="b-dst"></div></div></div>
<script>
var map=new maplibregl.Map({container:'map',style:{version:8,sources:{c:{type:'raster',tiles:['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png','https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],tileSize:256}},layers:[{id:'c',type:'raster',source:'c'}]},center:[106.84,-6.2],zoom:15,attributionControl:false});
var routeLine=null, destPt=null, steps=[], stepIdx=0, courier=null, follow=true, ready=false;
var stopMarkers=[];

map.on('load',function(){
  map.addSource('full',{type:'geojson',data:empty()});
  map.addSource('remain',{type:'geojson',data:empty()});
  map.addLayer({id:'full',type:'line',source:'full',paint:{'line-color':'#6b5a2a','line-width':6,'line-opacity':.35}});
  map.addLayer({id:'remain',type:'line',source:'remain',paint:{'line-color':'#ffd277','line-width':6,'line-opacity':.95}});
  ready=true;
});
map.on('dragstart',function(){follow=false;});

function empty(){return {type:'Feature',geometry:{type:'LineString',coordinates:[]}};}
function feat(coords){return {type:'Feature',geometry:{type:'LineString',coordinates:coords}};}
function setSrc(id,coords){ if(map.getSource(id)) map.getSource(id).setData(feat(coords)); }

function courierEl(){
  var d=document.createElement('div');d.className='courier';
  d.innerHTML='<svg width="30" height="30" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#e8b54a"/><path d="M12 5 L17 17 L12 14 L7 17 Z" fill="#120d03"/></svg>';
  return d;
}

async function setRoute(fLng,fLat,tLng,tLat,stops){
  if(!ready){ setTimeout(function(){setRoute(fLng,fLat,tLng,tLat,stops);},300); return; }
  destPt=[tLng,tLat]; stepIdx=0;
  // stop pins
  stopMarkers.forEach(function(m){m.remove();}); stopMarkers=[];
  (stops||[]).forEach(function(s){ var e=document.createElement('div'); e.className='pin'; e.style.background=s.color||'#ff5a4d';
    stopMarkers.push(new maplibregl.Marker({element:e}).setLngLat([s.lng,s.lat]).addTo(map)); });
  var coords=[[fLng,fLat],[tLng,tLat]];
  try{
    var url='https://router.project-osrm.org/route/v1/driving/'+fLng+','+fLat+';'+tLng+','+tLat+'?overview=full&geometries=geojson&steps=true';
    var r=await fetch(url).then(function(x){return x.json();});
    if(r.routes&&r.routes[0]){ coords=r.routes[0].geometry.coordinates; steps=r.routes[0].legs[0].steps||[]; }
    else steps=[];
  }catch(e){ steps=[]; }
  routeLine=coords;
  setSrc('full',coords); setSrc('remain',coords);
  try{ var b=coords.reduce(function(bb,c){return bb.extend(c);},new maplibregl.LngLatBounds(coords[0],coords[0]));
    map.fitBounds(b,{padding:80,maxZoom:16,duration:600}); }catch(e){}
  follow=true;
}

function deg(b){return (b*Math.PI)/180;}
function instr(st){
  var t=st.maneuver.type,m=st.maneuver.modifier||'',name=st.name||'';
  var dir={'left':'kiri','right':'kanan','slight left':'agak kiri','slight right':'agak kanan','sharp left':'tajam kiri','sharp right':'tajam kanan','straight':'lurus','uturn':'putar balik'}[m]||'';
  var ar={'left':'↰','right':'↱','slight left':'↖','slight right':'↗','straight':'↑','uturn':'↶'}[m]||'↑';
  var base;
  if(t==='turn'||t==='end of road') base='Belok '+dir;
  else if(t==='depart') {base='Mulai';ar='↑';}
  else if(t==='arrive') {base='Tiba di tujuan';ar='◉';}
  else if(t==='roundabout'||t==='rotary') {base='Masuk bundaran';ar='↻';}
  else if(t==='merge') base='Gabung '+dir;
  else if(t==='fork') base='Ambil cabang '+dir;
  else {base='Lurus';ar='↑';}
  return {text:base+(name?' ke '+name:''),arrow:ar};
}
function fmt(m){ return m>=1000? (m/1000).toFixed(1)+' km' : Math.round(m)+' m'; }

function updatePosition(lng,lat,heading){
  if(!ready) return;
  if(!courier){ courier=new maplibregl.Marker({element:courierEl(),rotationAlignment:'map'}); courier.setLngLat([lng,lat]).addTo(map); }
  else courier.setLngLat([lng,lat]);
  if(heading!=null && !isNaN(heading)) courier.setRotation(heading);
  if(routeLine){
    try{
      var line=turf.lineString(routeLine), pt=turf.point([lng,lat]);
      var snap=turf.nearestPointOnLine(line,pt);
      var rem=turf.lineSlice(snap,turf.point(destPt),line);
      setSrc('remain',rem.geometry.coordinates);
    }catch(e){}
    // turn banner
    if(steps&&steps.length){
      while(stepIdx<steps.length-1 && turf.distance(turf.point([lng,lat]),turf.point(steps[stepIdx].maneuver.location),{units:'meters'})<28) stepIdx++;
      var st=steps[stepIdx], d=instr(st), dist=turf.distance(turf.point([lng,lat]),turf.point(st.maneuver.location),{units:'meters'});
      document.getElementById('b-ar').textContent=d.arrow;
      document.getElementById('b-ins').textContent=d.text;
      document.getElementById('b-dst').textContent=fmt(dist);
      document.getElementById('banner').style.display='flex';
    }
  }
  if(follow) map.easeTo({center:[lng,lat],zoom:Math.max(map.getZoom(),16),duration:700});
}
function recenter(){ follow=true; if(courier) map.easeTo({center:courier.getLngLat(),zoom:16,duration:500}); }
</script></body></html>`;
