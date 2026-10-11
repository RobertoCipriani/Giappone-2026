import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Static city architecture is merged by material to keep mobile draw calls low.
export function createEnvironment(scene,renderer,root,L){
 const stage=L.stage,city=stage.city,night=stage.light===2||stage.light===4,dusk=stage.light===1;
 const resources=[],batches=new Map(),textures=[];let tick=0;
 const keep=x=>(resources.push(x),x),sky=night?0x111f42:dusk?0xc995a1:stage.light===3?0x9eafc8:0x9fc9e1;
 const previous={fog:scene.fog,background:scene.background};scene.background=new THREE.Color(sky);scene.fog=new THREE.Fog(sky,260,1400);
 const hemi=new THREE.HemisphereLight(night?0x9dadff:0xe5f1ff,0x76684b,night?1.0:1.7),sun=new THREE.DirectionalLight(dusk?0xffb280:0xfff1df,night?.6:2.2);
 sun.castShadow=true;const size=matchMedia('(pointer:coarse)').matches?1024:2048;sun.shadow.mapSize.set(size,size);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:450});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.045;sun.shadow.bias=-.0003;scene.add(hemi,sun,sun.target);
 function setShadowFocus(v){if(!v)return;sun.target.position.copy(v);sun.position.copy(v).add(new THREE.Vector3(90,180,-130));sun.target.updateMatrixWorld()}
 setShadowFocus(L.startPositions[0].position);
 const near=(x,z)=>L.nearest(x,z,true);
 function heightAt(x,z){if(Math.hypot(x-L.lake.x,z-L.lake.z)<L.lake.r)return -3;const q=near(x,z),natural=-1.2+Math.sin(x*.017)*Math.sin(z*.013)*3;if(q.i<0)return natural;const blend=Math.max(0,Math.min(1,(q.d2-1400)/5600));return (L.py[q.i]-.65)*(1-blend)+natural*blend}
 function add(g,color,x=0,y=0,z=0,ry=0,emissive=false){g.rotateY(ry).translate(x,y,z);const key=color+':'+emissive;if(!batches.has(key))batches.set(key,{color,emissive,geos:[]});batches.get(key).geos.push(g)}
 const box=(w,h,d,col,x,y,z,ry=0,glow=false)=>add(new THREE.BoxGeometry(w,h,d),col,x,y,z,ry,glow);
 const sphere=(r,col,x,y,z,sx=1,sy=1,sz=1)=>add(new THREE.SphereGeometry(r,8,6).scale(sx,sy,sz),col,x,y,z);
 const cylinder=(r,h,col,x,y,z)=>add(new THREE.CylinderGeometry(r,r,h,8),col,x,y,z);
 const earthy=city.kind==='city'||city.kind==='neon'?0x7b8188:city.kind==='alps'?0x7a936e:0xa29869;
 const ground=keep(new THREE.PlaneGeometry(2000,2000,100,100).rotateX(-Math.PI/2));const pos=ground.attributes.position;
 const colors=new Float32Array(pos.count*3),terrainColor=new THREE.Color(earthy),baseHSL={};terrainColor.getHSL(baseHSL);
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,heightAt(x,z));terrainColor.setHSL(baseHSL.h,baseHSL.s,baseHSL.l+(Math.sin(x*.03)*Math.cos(z*.021))*.04);colors[i*3]=terrainColor.r;colors[i*3+1]=terrainColor.g;colors[i*3+2]=terrainColor.b}ground.setAttribute('color',new THREE.BufferAttribute(colors,3));ground.computeVertexNormals();const terrain=new THREE.Mesh(ground,keep(new THREE.MeshLambertMaterial({vertexColors:true})));terrain.receiveShadow=true;root.add(terrain);
 const lakeGeo=keep(new THREE.CircleGeometry(L.lake.r,64).rotateX(-Math.PI/2));const waterMat=keep(new THREE.MeshStandardMaterial({color:night?0x183956:0x4e9fac,roughness:.2,metalness:.35,transparent:true,opacity:.95}));const lake=new THREE.Mesh(lakeGeo,waterMat);lake.position.set(L.lake.x,L.waterLevel-.1,L.lake.z);root.add(lake);
 function tree(x,y,z,kind='autumn',scale=1){cylinder(.8*scale,10*scale,0x665041,x,y+5*scale,z);if(kind==='bamboo'){cylinder(.3,20,0x7f9851,x,y+10,z);sphere(3,0x537943,x,y+17,z,.7,1.9,.7)}else if(kind==='pine'){add(new THREE.ConeGeometry(6*scale,15*scale,7),0x37594c,x,y+12*scale,z);add(new THREE.ConeGeometry(4.5*scale,11*scale,7),0x486b58,x,y+18*scale,z)}else{sphere(6*scale,(Math.abs(x*17+z*3)|0)%2?0xc9773e:0x9f603b,x,y+13*scale,z,1,1.1,1);sphere(4*scale,0xda9a4f,x+2*scale,y+16*scale,z-1)}}
 function torii(x,y,z,ry=0,s=1){const g=new THREE.Group();const mat=keep(new THREE.MeshStandardMaterial({color:0xce452e,roughness:.8}));for(const [w,h,d,xx,yy] of [[1,12,1,-5,6],[1,12,1,5,6],[14,1.1,1.8,0,12.5],[12,.8,1,0,10]]){const m=new THREE.Mesh(keep(new THREE.BoxGeometry(w,h,d)),mat);m.position.set(xx,yy,0);g.add(m)}g.position.set(x,y,z);g.rotation.y=ry;g.scale.setScalar(s);root.add(g)}
 function pagoda(x,y,z,ry=0,levels=4){for(let k=0;k<levels;k++){const width=17-k*2;box(width-3,5,width-3,0x9f4931,x,y+3+k*7,z,ry);add(new THREE.ConeGeometry(width*.8,3,4).rotateY(Math.PI/4),0x343b40,x,y+6+k*7,z,ry)}cylinder(.25,8,0xc9ad60,x,y+levels*7+3,z)}
 function house(x,y,z,ry=0,gassho=false){box(15,10,10,gassho?0xc4b090:0x88654c,x,y+5,z,ry);add(new THREE.ConeGeometry(12,gassho?15:5,4).rotateY(Math.PI/4).scale(1,1,.7),gassho?0x7e715d:0x383e42,x,y+10+(gassho?6:1),z,ry);for(let k=-1;k<=1;k++)box(1,9,11,0x443a31,x+k*6,y+4.5,z,ry);box(11,2,.3,night?0xffd783:0xe6d9ad,x,y+5,z+5.2,ry,night)}
 function deer(x,y,z){sphere(1.8,0xb58b5c,x,y+2.5,z,1.8,.85,.65);sphere(1,0xc5a275,x+2.4,y+3.7,z,.8,1.3,.75);for(const dx of [-1.7,1.6])for(const dz of [-.65,.65])cylinder(.18,2.4,0x765a3c,x+dx,y+1.2,z+dz);cylinder(.12,1.8,0x745d46,x+2.4,y+5,z);box(.15,.15,1.5,0x745d46,x+2.4,y+5.6,z)}
 function lantern(x,y,z){cylinder(.15,7,0x4b4540,x,y+3.5,z);sphere(.9,night?0xffd078:0xe8d0ac,x,y+6,z,1,1.35,1)}
 function sign(text,x,y,z,ry=0,w=9,h=4,color='#fdcf68'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const g=canvas.getContext('2d');g.fillStyle=night?'#172038':'#ebdfc7';g.fillRect(0,0,512,256);g.fillStyle=color;g.font='bold 74px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,128,475);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);const mesh=new THREE.Mesh(keep(new THREE.PlaneGeometry(w,h)),keep(new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide})));mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh)}
 // Roadside props follow the curve, safely outside barriers.
 const count=city.kind==='city'||city.kind==='neon'?70:48;
 for(let k=0;k<count;k++){const i=Math.floor(k/count*L.N),side=k%2?1:-1,d=(side>0?L.wallR[i]:L.wallL[i])+18+(k%3)*9,x=L.px[i]+L.rx[i]*d*side,z=L.pz[i]+L.rz[i]*d*side,y=heightAt(x,z),ry=L.head[i]+Math.PI/2;
  if(city.kind==='city'||city.kind==='neon'){const h=18+(k*13%50),c=[0x4c596d,0x707987,0x596b7e,0x555c78][k%4];box(15,h,13,c,x,y+h/2,z,ry);for(let row=0;row<Math.min(8,h/5);row++)box(11,1.7,.2,night?0xcce5ee:0xa1bbcc,x,y+4+row*5,z+6.6,ry,night);if(k%5===0)sign(['東京','ラーメン','大阪','ゲーム','寿司'][k%5],x,y+11,z+7,ry,9,5,['#ffa2ca','#b9a9ff','#83eac5'][k%3]);if(k%3===0)lantern(x,y,z)}
  else if(city.kind==='temple'){if(k%6===0)torii(x,y,z,ry,.8);else if(k%3===0)house(x,y,z,ry);else tree(x,y,z,k%2?'bamboo':'autumn')}
  else if(city.kind==='village'){if(k%2===0)house(x,y,z,ry,true);else tree(x,y,z,'autumn',1.2)}
  else if(city.kind==='oldtown'){if(k%3!==0)house(x,y,z,ry);else lantern(x,y,z)}
  else if(city.kind==='alps')tree(x,y,z,'pine',1+(k%3)*.15);
  else {tree(x,y,z,'autumn',1+(k%3)*.1);if(city.kind==='park'&&k%5===0)deer(x+4,y,z);if(k%7===0)lantern(x,y,z)}
 }
 // Recognizable silhouettes from the itinerary, interpreted as game scenery.
 if(city.kind==='city'){const x=80,z=115,y=heightAt(x,z);add(new THREE.CylinderGeometry(2,10,80,10),0xb8c8d4,x,y+40,z);cylinder(9,4,0xd0d8df,x,y+79,z);add(new THREE.CylinderGeometry(1,3,35,8),0xcbd6df,x,y+98,z);cylinder(.5,25,0xe3eff4,x,y+124,z);sign('SHIBUYA',-38,16,55,Math.PI/2,22,7,'#ff95c4')}
 if(city.kind==='temple'){pagoda(80,0,120,0,5);for(let k=0;k<8;k++)torii(-40-k*5,0,100+k*15,0,1);for(let k=0;k<30;k++)tree(70+k*4,0,-90+(k%4)*7,'bamboo')}
 if(city.kind==='neon'){sign('道頓堀',65,30,120,0,40,16,'#fe98ba');box(70,3,12,0xad7e61,60,7,110);for(let k=0;k<8;k++)house(-60-k*18,0,-50,Math.PI/2)}
 if(city.kind==='park')pagoda(85,0,70,0,5);
 if(city.kind==='garden'){pagoda(60,0,130,0,2);for(let x of [-10,10])cylinder(1,9,0x7d8179,L.lake.x+x,4,L.lake.z-90);box(28,2,5,0x8e927f,L.lake.x,8,L.lake.z-90)}
 if(city.kind==='village'||city.kind==='alps'){for(let k=0;k<12;k++){const x=-600+k*115,z=-650-(k%3)*40;add(new THREE.ConeGeometry(110,150+(k%4)*45,6),0x728387,x,45,z);add(new THREE.ConeGeometry(32,42,6),0xd6dfdb,x,120+(k%4)*22,z)}}
 if(city.kind==='alps'){box(70,2,9,0x9b8563,70,7,135);for(const x of [40,100])for(const z of [132,138])cylinder(.5,7,0x756449,x,4,z);sign('上高地',70,18,140,0,18,5,'#e7d4a2')}
 if(city.kind==='fuji'){add(new THREE.ConeGeometry(230,330,64),0x71879c,-170,145,-700);add(new THREE.ConeGeometry(65,95,64),0xf1eee6,-170,263,-700);pagoda(80,0,95,0,5);for(let k=0;k<6;k++)house(-80-k*20,0,100,0)}
 if(city.kind==='buddha'){const x=85,z=100;sphere(10,0x748b7c,x,7,z,1.6,.8,1.2);sphere(7,0x728b7a,x,16,z,.95,1.45,.9);sphere(5,0x789080,x,28,z,.85,1.15,.9);sphere(1.1,0x789080,x,34,z);for(let dx of [-7,7])sphere(2,0x748b7c,x+dx,15,z+4,1,2.5,1);torii(-60,0,75,0,1.4)}
 // Start landmark and billboard, readable while moving.
 sign(city.name.toUpperCase(),0,15,-66,0,24,5,'#b14b37');
 for(const batch of batches.values()){const geo=mergeGeometries(batch.geos,false);batch.geos.forEach(g=>g.dispose());if(!geo)continue;const material=keep(new THREE.MeshStandardMaterial({color:batch.color,roughness:.8,emissive:batch.emissive?batch.color:0,emissiveIntensity:batch.emissive?1.2:0}));const mesh=new THREE.Mesh(keep(geo),material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh)}
 return {sunLight:sun,hemiLight:hemi,heightAt,setShadowFocus,update(dt,time){tick=time;waterMat.color.setHex(night?0x183956:0x4e9fac);waterMat.roughness=.25+Math.sin(tick*.6)*.03},dispose(){scene.remove(hemi,sun,sun.target);sun.shadow.map?.dispose();resources.forEach(r=>r.dispose());textures.forEach(t=>t.dispose());scene.background=previous.background;scene.fog=previous.fog}};
}
