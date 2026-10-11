import * as THREE from 'three';
// Animated 3D bodies with photographic faces. Back-facing decal is intentional:
// the chase camera can see a friend's face instead of only the back of a head.
export function customizeDriver(model,character){
 const head=model.parts?.head,driver=model.parts?.driver;if(!head||!driver)return model;
 const own=[],tentacles=[],parts=[];let disposed=false,avatarTime=0;
 const material=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.7});own.push(m);return m};
 const attach=(geo,mat,parent,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);own.push(geo);m.position.set(x,y,z);parent.add(m);parts.push(m);return m};
 const orange=material(0xda8948),cream=material(0xffedd2),black=material(0x26303a);
 if(character.id==='kitsu'){
  head.children.forEach(o=>o.visible=false);
  attach(new THREE.SphereGeometry(.37,14,10),orange,head,0,.02,0);
  attach(new THREE.ConeGeometry(.14,.35,3),orange,head,-.23,.4,0);attach(new THREE.ConeGeometry(.14,.35,3),orange,head,.23,.4,0);
  for(const side of [-1,1]){const muzzle=attach(new THREE.SphereGeometry(.19,10,8),cream,head,side*.13,-.1,-.24);muzzle.scale.set(1,.7,.8);attach(new THREE.SphereGeometry(.045,8,6),black,head,side*.14,.07,-.32)}
  attach(new THREE.SphereGeometry(.055,8,6),black,head,0,-.06,-.36);
  const tail=attach(new THREE.ConeGeometry(.17,.75,9),orange,driver,.1,-.1,-.3);tail.rotation.x=1.1;tentacles.push({mesh:tail,base:tail.rotation.z,tail:true});
 }
 if(character.body==='white'){const coat=attach(new THREE.ConeGeometry(.49,.72,12),material(0xf4f0df),driver,0,.06,0);coat.scale.z=.8;attach(new THREE.SphereGeometry(.4,12,8),cream,head,0,.05,0)}
 if(character.body==='hero'){const cape=attach(new THREE.PlaneGeometry(.65,.95,1,2),material(0xbc473e),driver,0,.02,-.32);cape.rotation.x=.35;cape.material.side=THREE.DoubleSide;tentacles.push({mesh:cape,base:0,tail:true})}
 if(character.body==='octo')for(let k=0;k<6;k++){const angle=k/6*Math.PI*2,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(Math.cos(angle)*.35,-.12,Math.sin(angle)*.35),new THREE.Vector3(Math.cos(angle)*.7,-.5,Math.sin(angle)*.7),new THREE.Vector3(Math.cos(angle)*.85,-.25,Math.sin(angle)*.85)]);const t=attach(new THREE.TubeGeometry(curve,10,.075,6,false),material(0x8493b8),driver,0,.1,0);tentacles.push({mesh:t,base:0,phase:k})}
 if(character.photoURL){const img=new Image();img.onload=()=>{if(disposed)return;const [zoom,cx,cy]=character.faceCrop||[1,.5,.35],size=Math.min(img.width,img.height)/zoom,x=Math.max(0,Math.min(img.width-size,cx*img.width-size/2)),y=Math.max(0,Math.min(img.height-size,cy*img.height-size/2)),canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const g=canvas.getContext('2d');g.clearRect(0,0,256,256);g.save();g.beginPath();g.arc(128,128,126,0,Math.PI*2);g.clip();g.drawImage(img,x,y,size,size,0,0,256,256);g.restore();const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;own.push(tex);const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false});own.push(mat);for(const side of [-1,1]){const face=attach(new THREE.PlaneGeometry(.73,.73),mat,head,0,.07,side*.34);if(side===-1)face.rotation.y=Math.PI;face.castShadow=false;face.renderOrder=3}};img.src=character.photoURL}
 const animate=model.animate.bind(model),dispose=model.dispose.bind(model);model.animate=o=>{animate(o);avatarTime+=o?.dt||0;const time=avatarTime;tentacles.forEach((t,i)=>{t.mesh.rotation.z=t.base+Math.sin(time*6+(t.phase||i))*.13;t.mesh.rotation.x=t.tail?1.1+Math.sin(time*7)*.15:Math.sin(time*5+i)*.12})};model.dispose=()=>{disposed=true;own.forEach(x=>x.dispose?.());parts.forEach(x=>x.removeFromParent());dispose()};return model;
}
