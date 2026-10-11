import * as THREE from 'three';

// Shared procedural costumes. No photograph or account data is embedded here.
export const FRIEND_BODIES=Object.freeze({andrea:'muscular',manuel:'round',francesco:'creature',leonardo:'pope',gabriele:'octo'});
export const BODY_OPTIONS=[['traveler','Viaggiatore'],['muscular','Palestrato'],['round','Corporatura robusta'],['creature','Costume da mostriciattolo'],['pope','Papa'],['white','Abito bianco'],['hero','Supereroe'],['octo','Polpo']];
export function bodyFor(character){return !character.customBody&&FRIEND_BODIES[character.id]&&['traveler','hero','white'].includes(character.body)?FRIEND_BODIES[character.id]:character.body;}
export function portraitFor(character){const body=bodyFor(character);return ['muscular','round','creature','pope','octo'].includes(body)?new URL('../portraits/'+body+'.png?v=20261011-piloti',import.meta.url).href:'';}

export function addFriendCostume({character,head,driver,attach,material}){
 const kind=bodyFor(character),motion=[],skin=material(character.skin||0xeac09e),dark=material(0x202936);
 const sphere=(parent,x,y,z,sx,sy,sz,mat)=>{const m=attach(new THREE.SphereGeometry(1,12,8),mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m;};
 const group=(parent,x,y,z)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
 const hideTorso=()=>driver.children.filter(o=>o!==head).forEach(o=>o.visible=false);
 const hideHat=()=>head.children.forEach(o=>o.visible=false);
 if(kind==='muscular'){
  hideTorso();const torso=group(driver,0,.13,0);
  sphere(torso,0,.05,0,.46,.38,.28,skin);
  for(const side of [-1,1]){
   sphere(torso,side*.19,.16,.19,.22,.16,.11,skin);
   const shoulder=group(torso,side*.43,.19,0);sphere(shoulder,0,0,0,.18,.18,.19,skin);
   sphere(shoulder,side*.04,-.19,.06,.15,.22,.15,skin);sphere(shoulder,side*.02,-.32,.21,.115,.14,.12,skin);
   const weight=group(shoulder,side*.02,-.34,.33);const bar=attach(new THREE.CylinderGeometry(.025,.025,.32,8),material(0x9ba7b1),weight);bar.rotation.z=Math.PI/2;
   for(const end of [-1,1]){const plate=attach(new THREE.CylinderGeometry(.095,.095,.07,10),dark,weight,end*.14,0,0);plate.rotation.z=Math.PI/2;}
   motion.push({mesh:shoulder,type:'flex',phase:side});
  }
  sphere(driver,0,-.22,0,.36,.17,.28,dark);
  attach(new THREE.TorusGeometry(.305,.035,6,20),material(0xb23e42),head,0,.25,0).rotation.x=Math.PI/2;
 }
 if(kind==='round'){
  hideTorso();const torso=group(driver,0,.06,.01),shirt=material(0x405c8c),belly=skin;
  sphere(torso,0,.07,0,.53,.4,.4,shirt);sphere(torso,0,-.05,.23,.44,.29,.27,belly);
  sphere(torso,0,-.09,.495,.028,.035,.012,material(0xb67e60));
  for(const side of [-1,1])sphere(torso,side*.46,.08,.02,.14,.22,.19,shirt);
  sphere(driver,0,-.22,0,.44,.13,.33,dark);motion.push({mesh:torso,type:'breathe',base:1});
 }
 if(kind==='creature'){
  hideTorso();hideHat();const yellow=material(0xf1bf43),brown=material(0x875839),belly=material(0xffe6a6);
  sphere(driver,0,.02,0,.42,.4,.32,yellow);sphere(driver,0,.02,.28,.27,.28,.075,belly);
  sphere(head,0,.11,0,.38,.33,.33,yellow);
  for(const side of [-1,1]){
   const ear=group(head,side*.25,.38,0);const e=attach(new THREE.ConeGeometry(.09,.46,8),yellow,ear,0,.13,0);e.rotation.z=-side*.2;
   const tip=attach(new THREE.ConeGeometry(.062,.17,8),dark,ear,side*.047,.31,0);tip.rotation.z=-side*.2;
   sphere(head,side*.23,0,.29,.08,.06,.025,material(0xcc5250));
   sphere(driver,side*.39,.03,.08,.11,.2,.12,yellow);motion.push({mesh:ear,type:'ear',phase:side});
  }
  const tail=group(driver,.28,-.02,-.32);
  const zigzag=new THREE.Shape();zigzag.moveTo(0,0);zigzag.lineTo(.12,.13);zigzag.lineTo(.04,.25);zigzag.lineTo(.32,.47);zigzag.lineTo(.41,.31);zigzag.lineTo(.23,.2);zigzag.lineTo(.3,.1);zigzag.lineTo(.08,-.09);zigzag.closePath();
  attach(new THREE.ExtrudeGeometry(zigzag,{depth:.06,bevelEnabled:false}),yellow,tail);motion.push({mesh:tail,type:'tail'});
  for(const y of [.02,.16])sphere(driver,0,y,-.29,.23,.035,.04,brown);
 }
 if(kind==='pope'){
  hideTorso();hideHat();const white=material(0xfaf5e7),gold=material(0xd9a747),red=material(0xb64743);
  const robe=attach(new THREE.CylinderGeometry(.28,.49,.65,16),white,driver,0,.02,0);robe.scale.z=.82;
  const cape=attach(new THREE.ConeGeometry(.44,.32,16),white,driver,0,.31,0);cape.scale.z=.86;
  sphere(head,0,.1,0,.33,.29,.31,skin);
  const hat=group(head,0,.46,0),shape=new THREE.Shape();shape.moveTo(-.25,-.05);shape.lineTo(-.22,.26);shape.lineTo(0,.56);shape.lineTo(.22,.26);shape.lineTo(.25,-.05);shape.closePath();
  attach(new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:1,steps:1}),white,hat,0,0,-.06);
  for(const z of [-.075,.08]){
   attach(new THREE.BoxGeometry(.045,.29,.012),gold,hat,0,.17,z);attach(new THREE.BoxGeometry(.18,.045,.012),gold,hat,0,.21,z);
  }
  for(const side of [-1,1]){attach(new THREE.BoxGeometry(.065,.47,.02),red,driver,side*.13,.02,.3);sphere(driver,side*.36,.11,0,.115,.23,.13,white);}
  const pendant=group(driver,0,.02,.34);attach(new THREE.BoxGeometry(.025,.14,.02),gold,pendant);attach(new THREE.BoxGeometry(.095,.025,.02),gold,pendant,0,.025,0);motion.push({mesh:pendant,type:'pendant'});
 }
 if(kind==='octo'){
  hideTorso();hideHat();const purple=material(0x9a74ae),pale=material(0xdfb7d6);
  sphere(driver,0,.13,0,.43,.36,.38,purple);sphere(head,0,.16,0,.39,.38,.36,purple);
  for(let k=0;k<8;k++){
   const angle=k/8*Math.PI*2,arm=group(driver,0,.02,0);arm.rotation.y=angle;
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.25,0,0),new THREE.Vector3(.55,-.18,0),new THREE.Vector3(.82,-.34,0),new THREE.Vector3(.91,-.1,0),new THREE.Vector3(.8,.09,0)]);
   attach(new THREE.TubeGeometry(curve,12,.072,6,false),purple,arm);
   for(const t of [.25,.42,.59,.75]){const p=curve.getPoint(t);sphere(arm,p.x,p.y-.062,.012,.044,.018,.041,pale);}
   motion.push({mesh:arm,type:'tentacle',phase:k,base:angle});
  }
 }
 if(['creature','pope','octo'].includes(kind)&&!character.photoURL){
  const faceZ=kind==='octo'?.375:.335;
  for(const side of [-1,1])sphere(head,side*.105,.18,faceZ,.024,.033,.014,dark);
  const smile=attach(new THREE.TorusGeometry(.047,.009,5,14,Math.PI),dark,head,0,.09,faceZ);
  smile.rotation.z=Math.PI;
 }
 driver.userData.friendBody=kind;
 return time=>motion.forEach(({mesh,type,phase=0,base=0})=>{
  const wave=Math.sin(time*(type==='breathe'?2.5:4)+phase);
  if(type==='flex')mesh.rotation.x=wave*.12;
  if(type==='breathe')mesh.scale.set(1+wave*.025,1+wave*.018,1+wave*.025);
  if(type==='ear')mesh.rotation.z=wave*.09;
  if(type==='tail')mesh.rotation.y=wave*.2;
  if(type==='pendant')mesh.rotation.z=wave*.12;
  if(type==='tentacle'){mesh.rotation.y=base+wave*.12;mesh.rotation.z=Math.sin(time*3+phase)*.12;}
 });
}
