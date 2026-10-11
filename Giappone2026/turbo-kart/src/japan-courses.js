// Fictional racing circuits inspired by the group's real itinerary.
export const CITIES=[
 {id:'tokyo',name:'Tokyo',spot:'Shibuya e Asakusa',kind:'city',color:0xe7528b,x:1,z:1,height:1},
 {id:'kyoto',name:'Kyoto',spot:'Fushimi Inari e Arashiyama',kind:'temple',color:0xd76437,x:.91,z:1.04,height:.8},
 {id:'osaka',name:'Osaka',spot:'Dotonbori',kind:'neon',color:0x8c78ff,x:1.08,z:.86,height:.7},
 {id:'nara',name:'Nara',spot:'Il parco dei cervi',kind:'park',color:0xd9a758,x:.92,z:.92,height:.5},
 {id:'kanazawa',name:'Kanazawa',spot:'Kenrokuen e quartieri storici',kind:'garden',color:0x73a793,x:1.03,z:.95,height:.6},
 {id:'shirakawago',name:'Shirakawa-go',spot:'Il villaggio gassho-zukuri',kind:'village',color:0xc68a65,x:.86,z:1.03,height:1.2},
 {id:'takayama',name:'Takayama',spot:'Sanmachi e Hida Furukawa',kind:'oldtown',color:0xb56d54,x:1.09,z:.9,height:.9},
 {id:'kamikochi',name:'Kamikochi',spot:'Azusa e ponte Kappa',kind:'alps',color:0x69aabb,x:.94,z:1.1,height:1.4},
 {id:'fuji',name:'Monte Fuji',spot:'Kawaguchiko e Fujiyoshida',kind:'fuji',color:0x88a9de,x:1.05,z:1.02,height:1.1},
 {id:'kamakura',name:'Kamakura',spot:'Il Grande Buddha e la costa',kind:'buddha',color:0x91b090,x:.9,z:.96,height:.8}
];
const LIGHTS=['Mattina','Tramonto','Notte','Alba','Sera'];
export const COURSE_VERSION='japan-v1';
export const STAGES=CITIES.flatMap((city,c)=>Array.from({length:5},(_,v)=>({id:c*5+v,city,variant:v,name:city.name+' · '+LIGHTS[v],label:'Gara '+String(c*5+v+1).padStart(2,'0'),light:v})));
export function stageAt(id=0){return STAGES[Math.max(0,Math.min(STAGES.length-1,Number(id)||0))]}
export function coursePoints(points,stage){const c=stage.city,v=stage.variant;return points.map(([x,y,z],i)=>[x*c.x*(1+v*.035)+Math.sin(i*.7+v)*v*5,y*c.height,z*c.z*(1-v*.022)+Math.sin(i*1.1)*v*4])}
