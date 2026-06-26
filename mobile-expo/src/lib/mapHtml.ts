// Builds a self-contained MapLibre GL JS page (dark CARTO raster tiles — free, no API key)
// rendered inside a WebView. Avoids native MapLibre so the whole flow runs in Expo Go.
import { theme } from '../theme';

type Stop = {
  id: string;
  sequence: number;
  status: string;
  spoilage_risk: string;
  order: { recipient_name: string; latitude: number; longitude: number };
};

export function buildMapHtml(
  depot: { lat: number; lng: number } | null,
  stops: Stop[],
  currentId: string | null,
): string {
  const risk = theme.color.risk as Record<string, string>;
  const points = stops.map((s) => ({
    lng: s.order.longitude,
    lat: s.order.latitude,
    seq: s.sequence,
    name: s.order.recipient_name,
    color: s.status === 'delivered' ? theme.color.ink2 : (risk[s.spoilage_risk] ?? theme.color.accent),
    current: s.id === currentId,
  }));
  const data = JSON.stringify({ depot, points, accent: theme.color.accent, accentT: theme.color.accentT });

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet">
<style>
  html,body,#map{height:100%;margin:0;background:#000}
  .pin{width:26px;height:26px;border-radius:50% 50% 50% 2px;transform:rotate(45deg);border:2px solid #000;
       display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,.6)}
  .pin span{transform:rotate(-45deg);color:#fff;font:600 11px Inter,sans-serif}
  .pin.cur{width:32px;height:32px;box-shadow:0 0 0 4px rgba(82,100,174,.35),0 4px 10px rgba(0,0,0,.6)}
  .dep{width:22px;height:22px;border-radius:50%;border:2px solid #000}
</style></head><body><div id="map"></div><script>
  const D=${data};
  const map=new maplibregl.Map({container:'map',
    style:{version:8,sources:{c:{type:'raster',tiles:['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png','https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OSM © CARTO'}},layers:[{id:'c',type:'raster',source:'c'}]},
    center:D.depot?[D.depot.lng,D.depot.lat]:[106.84,-6.2],zoom:12,attributionControl:false});
  const bounds=new maplibregl.LngLatBounds();
  const line=[];
  if(D.depot){
    const el=document.createElement('div');el.className='dep';el.style.background=D.accentT;
    new maplibregl.Marker({element:el}).setLngLat([D.depot.lng,D.depot.lat]).addTo(map);
    bounds.extend([D.depot.lng,D.depot.lat]);line.push([D.depot.lng,D.depot.lat]);
  }
  D.points.forEach(p=>{
    const el=document.createElement('div');el.className='pin'+(p.current?' cur':'');el.style.background=p.color;
    el.innerHTML='<span>'+p.seq+'</span>';
    new maplibregl.Marker({element:el}).setLngLat([p.lng,p.lat]).addTo(map);
    bounds.extend([p.lng,p.lat]);line.push([p.lng,p.lat]);
  });
  map.on('load',()=>{
    if(line.length>1){
      map.addSource('r',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:line}}});
      map.addLayer({id:'r',type:'line',source:'r',paint:{'line-color':D.accent,'line-width':3,'line-opacity':.85}},'c');
      map.moveLayer('r');
    }
    try{map.fitBounds(bounds,{padding:60,maxZoom:14,duration:0});}catch(e){}
  });
</script></body></html>`;
}
