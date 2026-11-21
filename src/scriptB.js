
/* ============================================================
   PARSEC CHRONICLES 3D — Script B: three.js tilt-shift renderer.
   Reads game state only. If anything here fails the game keeps
   running on the 2D canvas renderer.
   ============================================================ */
(async()=>{
const fail=()=>{
 window.R3D={on:false,failed:true,ready:false,render(){return false;},resize(){},
  w2s(x,y,z){return{x:x-camX,y:H/2+(y-camY-H/2)*TILT-(z||0)*ALT_PX};},
  s2w(sx,sy){return{x:sx+camX,y:(sy-H/2)/TILT+camY+H/2};},preview(){return false;}};
 try{r3dReady();}catch(e){}
};
let THREE,EffectComposer,RenderPass,UnrealBloomPass,ShaderPass,OutputPass,BGU,RoomEnvironment;
try{
 const mods=await Promise.all([
  import('three'),
  import('three/addons/postprocessing/EffectComposer.js'),
  import('three/addons/postprocessing/RenderPass.js'),
  import('three/addons/postprocessing/UnrealBloomPass.js'),
  import('three/addons/postprocessing/ShaderPass.js'),
  import('three/addons/postprocessing/OutputPass.js'),
  import('three/addons/utils/BufferGeometryUtils.js'),
  import('three/addons/environments/RoomEnvironment.js')
 ]);
 THREE=mods[0];EffectComposer=mods[1].EffectComposer;RenderPass=mods[2].RenderPass;UnrealBloomPass=mods[3].UnrealBloomPass;
 ShaderPass=mods[4].ShaderPass;OutputPass=mods[5].OutputPass;BGU=mods[6];RoomEnvironment=mods[7].RoomEnvironment;
}catch(e){fail();return;}

try{
const glc=document.getElementById('glCanvas');
const renderer=new THREE.WebGLRenderer({canvas:glc,antialias:false,alpha:false,powerPreference:'high-performance'});
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const ALT=140,FLOOR=-170,PITCH=55*Math.PI/180,HALF_FOV=16*Math.PI/180,PI=Math.PI;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x03050a);
const cam=new THREE.PerspectiveCamera(32,16/9,40,30000);
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(renderer),.04).texture;
const HEMI=1.7,hemi=new THREE.HemisphereLight(0xa8c6ff,0x241a2c,HEMI);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe0bc,4.2);sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0005;sun.shadow.normalBias=1.2;sun.shadow.radius=3;
sun.shadow.camera.near=100;sun.shadow.camera.far=4200;scene.add(sun);scene.add(sun.target);
const V=new THREE.Vector3(),V2=new THREE.Vector3(),Q=new THREE.Quaternion(),XA=new THREE.Vector3(1,0,0),C=new THREE.Color(),dummy=new THREE.Object3D();

/* ---------- procedural textures ---------- */
function canvasTex(c,repeat){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=4;return t;}
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function noiseFn(seed){
 const p=new Uint8Array(512),r=mulberry32(seed);for(let i=0;i<256;i++)p[i]=i;
 for(let i=255;i>0;i--){const j=r()*(i+1)|0,t=p[i];p[i]=p[j];p[j]=t;}for(let i=0;i<256;i++)p[i+256]=p[i];
 return(x,y,per)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=per||256,x0=((xi%w)+w)%w,x1=(x0+1)%w,y0=yi&255,y1=(yi+1)&255;
  const a=p[p[x0]+y0],b=p[p[x1]+y0],c=p[p[x0]+y1],d=p[p[x1]+y1],t0=a+(b-a)*u,t1=c+(d-c)*u;return(t0+(t1-t0)*v)/255;};
}
function fbm(n,x,y,per){return n(x,y,per)*.5+n(x*2,y*2,per*2)*.25+n(x*4,y*4,per*4)*.125+n(x*8,y*8,per*8)*.0625;}
const panelTex=(()=>{
 const c=mkCanvas(256,256),x=c.getContext('2d'),r=mulberry32(77);
 x.fillStyle='#d6d6d6';x.fillRect(0,0,256,256);
 for(let i=0;i<46;i++){const v=r()<.5?255:90;x.fillStyle='rgba('+v+','+v+','+v+','+(.04+r()*.09)+')';x.fillRect(r()*256|0,r()*256|0,16+r()*80,10+r()*52);}
 x.strokeStyle='rgba(30,32,36,.5)';x.lineWidth=1;
 for(let y=0;y<256;y+=64){x.beginPath();x.moveTo(0,y+.5);x.lineTo(256,y+.5);x.stroke();let px=r()*60;while(px<256){x.beginPath();x.moveTo(px,y);x.lineTo(px,y+64);x.stroke();px+=70+r()*110;}}
 x.fillStyle='rgba(40,42,46,.4)';for(let y=0;y<256;y+=64)for(let px=4;px<256;px+=13){x.fillRect(px,y+4,1.2,1.2);x.fillRect(px,y+59,1.2,1.2);}
 for(let i=0;i<70;i++){x.fillStyle='rgba(70,62,54,'+(r()*.16)+')';x.fillRect(r()*256,r()*256,14+r()*70,1+r()*2.4);}
 for(let i=0;i<26;i++){x.fillStyle='rgba(255,255,255,'+(r()*.14)+')';x.fillRect(r()*256,r()*256,6+r()*30,1);}
 return canvasTex(c,true);
})();
const solarTex=(()=>{const c=mkCanvas(64,64),x=c.getContext('2d');x.fillStyle='#10244a';x.fillRect(0,0,64,64);x.strokeStyle='#5a86d8';x.lineWidth=1;for(let i=0;i<=64;i+=8){x.beginPath();x.moveTo(i+.5,0);x.lineTo(i+.5,64);x.moveTo(0,i+.5);x.lineTo(64,i+.5);x.stroke();}return canvasTex(c,true);})();
const moonTex=(()=>{
 const c=mkCanvas(512,256),x=c.getContext('2d'),r=mulberry32(4242),n=noiseFn(909),img=x.createImageData(512,256),d=img.data;
 for(let y=0;y<256;y++)for(let px=0;px<512;px++){const v=120+fbm(n,px/512*12,y/256*8,12)*110|0,i=(y*512+px)*4;d[i]=v;d[i+1]=v-3;d[i+2]=v-8;d[i+3]=255;}
 x.putImageData(img,0,0);
 for(let i=0;i<90;i++){const cx=r()*512,cy=20+r()*216,cr=3+r()*r()*26;const g=x.createRadialGradient(cx,cy,0,cx,cy,cr);g.addColorStop(0,'rgba(40,38,36,.55)');g.addColorStop(.75,'rgba(60,58,54,.35)');g.addColorStop(.9,'rgba(235,232,225,.5)');g.addColorStop(1,'rgba(200,200,200,0)');x.fillStyle=g;x.beginPath();x.arc(cx,cy,cr,0,PI*2);x.fill();}
 return canvasTex(c,false);
})();
/* moons: three surface types (grey regolith, tan dust, pale ice). A height field is built first, craters with rims and
   central peaks are stamped into it (stretched by latitude so they stay round on the sphere), then colour and bump maps
   are derived from it. Built once per type and shared by every moon of that type. */
const MOONV=[[.74,.72,.69,.95],[.8,.66,.5,.95],[.72,.82,.9,.6]],moonCache=[];
function moonMat(v){
 if(moonCache[v])return moonCache[v];
 const TW=768,TH=384,h=new Float32Array(TW*TH),n=noiseFn(700+v*13),r=mulberry32(4242+v*7),tint=MOONV[v];
 const pole=y=>clamp((Math.abs(y/TH-.5)*2-.66)/.26,0,1);
 for(let y=0;y<TH;y++){const pf=1-pole(y);for(let x=0;x<TW;x++)h[y*TW+x]=.5+((fbm(n,x/TW*10,y/TH*7,10)-.5)*.5+(fbm(n,x/TW*40,y/TH*28,40)-.5)*.1)*pf;}
 for(let i=0;i<150;i++){
  const cy=24+r()*(TH-48),cx=r()*TW,cr=2.5+r()*r()*26,lat=(cy/TH-.5)*PI,st=1/Math.max(.22,Math.cos(lat)),depth=.1+r()*.12,rx=Math.ceil(cr*1.4*st),ry=Math.ceil(cr*1.4);
  for(let dy=-ry;dy<=ry;dy++){
   const yy=Math.round(cy)+dy;if(yy<0||yy>=TH)continue;
   for(let dx=-rx;dx<=rx;dx++){const xx=((Math.round(cx)+dx)%TW+TW)%TW,q=Math.hypot(dx/st,dy)/cr;let k=0;if(q<1){k=-depth*(1-q*q);if(cr>13&&q<.2)k+=depth*.7*(1-q/.2);}else if(q<1.4)k=depth*.45*(1-(q-1)/.4);h[yy*TW+xx]+=k;}
  }
 }
 const c=mkCanvas(TW,TH),x=c.getContext('2d'),img=x.createImageData(TW,TH),d=img.data,bc=mkCanvas(TW,TH),bx=bc.getContext('2d'),bi=bx.createImageData(TW,TH),bd=bi.data;
 for(let y=0;y<TH;y++)for(let px=0;px<TW;px++){
  const i=y*TW+px,j=i*4,hv=clamp(h[i],0,1),mare=(pole(y)<.05&&fbm(n,px/TW*5+20,y/TH*4+20,5)<.44)?.72:1,s=(.35+hv*.8)*mare;
  d[j]=clamp(tint[0]*s,0,1)*255;d[j+1]=clamp(tint[1]*s,0,1)*255;d[j+2]=clamp(tint[2]*s,0,1)*255;d[j+3]=255;bd[j]=bd[j+1]=bd[j+2]=hv*255;bd[j+3]=255;
 }
 x.putImageData(img,0,0);bx.putImageData(bi,0,0);
 const map=canvasTex(c,false),bump=new THREE.CanvasTexture(bc);bump.colorSpace=THREE.NoColorSpace;bump.anisotropy=4;
 return moonCache[v]=new THREE.MeshStandardMaterial({map,bumpMap:bump,bumpScale:5,metalness:0,roughness:tint[3],envMapIntensity:.25});
}
/* planet surface: colour map plus (rocky worlds) a height/gloss map so oceans shine and land has relief */
function planetTex(g){
 const TW=768,TH=384,c=mkCanvas(TW,TH),x=c.getContext('2d'),img=x.createImageData(TW,TH),d=img.data,n=noiseFn(g.seed),a=crgb(g.c1),b=crgb(g.c2),fq=14+g.seed%9;
 let ac=null,ax=null,ai=null,ad=null;
 if(!g.gas){ac=mkCanvas(TW,TH);ax=ac.getContext('2d');ai=ax.createImageData(TW,TH);ad=ai.data;}
 const rs=mulberry32(g.seed+11),storms=[];
 if(g.gas)for(let i=0;i<3;i++)storms.push([rs(),.25+rs()*.5,.03+rs()*.05,.02+rs()*.03]);
 for(let y=0;y<TH;y++){
  const v=y/TH;
  for(let px=0;px<TW;px++){
   const u=px/TW,i=(y*TW+px)*4;let r,gg,bb;
   if(g.gas){
    let t=clamp((Math.sin(v*fq+fbm(n,u*8,v*6,8)*3.4)*.5+.5)*.7+fbm(n,u*16,v*26,16)*.36,0,1),warm=0;
    for(const s of storms){let du=Math.abs(u-s[0]);if(du>.5)du=1-du;const dv=v-s[1],q=du*du/(s[2]*s[2])+dv*dv/(s[3]*s[3]);if(q<1){const k=1-q;t=t*(1-k)+(.5+.5*Math.sin(q*10+Math.atan2(dv,du)*2))*k;if(k>warm)warm=k;}}
    {const lt=Math.abs(v-.5)*2,pf=clamp((lt-.72)/.22,0,1);t=t*(1-pf)+.42*pf;warm*=1-pf;}
    r=b[0]*.55+(a[0]*1.2-b[0]*.55)*t+warm*.18;gg=b[1]*.55+(a[1]*1.2-b[1]*.55)*t-warm*.03;bb=b[2]*.55+(a[2]*1.2-b[2]*.55)*t-warm*.1;
   }else{
    const h=fbm(n,u*8,v*8,8)*1.08,lat=Math.abs(v-.5)*2;let av;
    if(h<.5){const t=h/.5,sh=clamp((h-.44)/.06,0,1);r=b[0]*(.28+t*.5)+sh*.1;gg=b[1]*(.3+t*.55)+sh*.18;bb=b[2]*(.38+t*.7)+sh*.18;av=80;}
    else{
     const t=(h-.5)/.5,k=.72+fbm(n,u*32,v*32,32)*.56,dry=clamp(1-lat*1.6,0,1)*.35;
     r=(a[0]*(1-t)+(a[0]*.5+.4)*t)*k+dry*.12;gg=(a[1]*(1-t)+(a[1]*.5+.36)*t)*k+dry*.06;bb=(a[2]*(1-t)+(a[2]*.5+.3)*t)*k-dry*.05;
     if(t>.6){const sn=clamp((t-.6)/.16,0,1);r+=(.93-r)*sn;gg+=(.94-gg)*sn;bb+=(.96-bb)*sn;}
     av=150+t*105;
    }
    const pc=clamp((lat*.5-.4+fbm(n,u*8,v*4,8)*.06)*14,0,1);r+=(.92-r)*pc;gg+=(.94-gg)*pc;bb+=(.97-bb)*pc;if(pc>.5)av=200;
    ad[i]=ad[i+1]=ad[i+2]=av;ad[i+3]=255;
   }
   d[i]=clamp(r,0,1)*255;d[i+1]=clamp(gg,0,1)*255;d[i+2]=clamp(bb,0,1)*255;d[i+3]=255;
  }
 }
 x.putImageData(img,0,0);
 let aux=null;if(ac){ax.putImageData(ai,0,0);aux=new THREE.CanvasTexture(ac);aux.colorSpace=THREE.NoColorSpace;aux.anisotropy=4;}
 return{map:canvasTex(c,false),aux};
}
function cloudTex(g){
 const TW=512,TH=256,c=mkCanvas(TW,TH),x=c.getContext('2d'),img=x.createImageData(TW,TH),d=img.data,n=noiseFn(g.seed+31);
 for(let y=0;y<TH;y++)for(let px=0;px<TW;px++){const u=px/TW,v=y/TH,i=(y*TW+px)*4,w=fbm(n,u*4+7,v*3,4)*.25,h=fbm(n,u*8+w*4,v*6+w*3,8),a=clamp((h-.56)/.16,0,1);d[i]=d[i+1]=d[i+2]=255;d[i+3]=a*170;}
 x.putImageData(img,0,0);return canvasTex(c,false);
}
function ringTex(g){
 const N=512,c=mkCanvas(N,N),x=c.getContext('2d'),r=mulberry32(g.seed+5),col=crgb(g.c1),gap=.35+r()*.3,M2=150;
 for(let i=0;i<M2;i++){
  const f=i/M2,rad=N/2*(.71+.29*f);let al=.2+r()*.8;const k=.7+r()*.5;
  if(Math.abs(f-gap)<.045||r()<.07)al=0;else if(f<.12)al*=.35;
  x.strokeStyle='rgba('+(clamp(col[0]*k+.25,0,1)*255|0)+','+(clamp(col[1]*k+.25,0,1)*255|0)+','+(clamp(col[2]*k+.22,0,1)*255|0)+','+al.toFixed(2)+')';x.lineWidth=N*.29/2/M2+.6;x.beginPath();x.arc(N/2,N/2,rad,0,PI*2);x.stroke();
 }
 return canvasTex(c,false);
}

/* ---------- geometry kit ---------- */
const GEO={
 box:new THREE.BoxGeometry(1,1,1),sph:new THREE.SphereGeometry(1,14,10),sphMid:new THREE.SphereGeometry(1,24,16),sphHi:new THREE.SphereGeometry(1,56,36),
 cylX:new THREE.CylinderGeometry(1,1,1,10).rotateZ(-PI/2),disc:new THREE.CircleGeometry(1,14),
 flame:new THREE.ConeGeometry(1,1,10,1,true).translate(0,.5,0).rotateZ(PI/2),
 arc:new THREE.TorusGeometry(1.5,.045,6,20,PI*.9).rotateZ(-PI*.45).rotateX(PI/2),
 ringThin:new THREE.TorusGeometry(1.25,.03,6,32).rotateX(PI/2),
 hoop:new THREE.TorusGeometry(1,.09,5,14,PI).rotateY(PI/2),
 pring:new THREE.RingGeometry(1.22,1.72,80).rotateX(-PI/2),shock:new THREE.RingGeometry(.86,1,48).rotateX(-PI/2),
 plane:new THREE.PlaneGeometry(2,2).rotateX(-PI/2),tetra:new THREE.TetrahedronGeometry(1),oct:new THREE.OctahedronGeometry(1),
 shot:new THREE.SphereGeometry(1,8,6),beam:new THREE.CylinderGeometry(.5,.5,1,6).rotateZ(-PI/2),ast:[]
};
/* asteroids: six lumpy, elongated variants with impact dents; faces are tinted by height so ridges catch light and pits stay dark */
for(let k=0;k<6;k++){
 const g=new THREE.IcosahedronGeometry(1,3),n=noiseFn(300+k*17),p=g.attributes.position,rk=mulberry32(900+k),dents=[],col=new Float32Array(p.count*3),hs=new Float32Array(p.count);
 const sx=.85+rk()*.35,sy=.6+rk()*.3,sz=.8+rk()*.4;
 for(let i=0;i<5;i++){const a=rk()*PI*2,z=rk()*2-1,s=Math.sqrt(1-z*z);dents.push([Math.cos(a)*s,z,Math.sin(a)*s,.25+rk()*.4]);}
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  let d=.72+fbm(n,x*1.3+9,y*1.3+z*2.3+9,256)*.5+fbm(n,x*4+13,y*4+z*5.1+13,256)*.12;
  for(const c of dents){const q=Math.acos(clamp(x*c[0]+y*c[1]+z*c[2],-1,1))/c[3];if(q<1)d-=.26*c[3]*(1-q*q);else if(q<1.3)d+=.03*(1-(q-1)/.3);}
  hs[i]=d;p.setXYZ(i,x*d*sx,y*d*sy,z*d*sz);
 }
 for(let f=0;f<p.count;f+=3){const h=(hs[f]+hs[f+1]+hs[f+2])/3,v=clamp(.6+(h-.95)*1.2+(rk()-.5)*.14,.28,1.05);for(let j=0;j<3;j++){col[(f+j)*3]=v;col[(f+j)*3+1]=v*.96;col[(f+j)*3+2]=v*.9;}}
 g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();
 g.computeBoundingSphere();const bs=1/g.boundingSphere.radius;g.scale(bs,bs,bs);
 GEO.ast.push(g);
}
function loft(secs,seg,ex,flat){
 const n=secs.length,pos=[],uv=[],idx=[],R=seg+1,e=2/ex;
 for(let i=0;i<n;i++){const s=secs[i];for(let k=0;k<=seg;k++){const t=k/seg*PI*2,c=Math.cos(t),sn=Math.sin(t);const z=s.w*Math.sign(c)*Math.pow(Math.abs(c),e);let y=s.h*Math.sign(sn)*Math.pow(Math.abs(sn),e);if(y<0)y*=flat;pos.push(s.x,y+(s.y||0),z);uv.push(i/(n-1)*2,k/seg*2);}}
 for(let i=0;i<n-1;i++)for(let k=0;k<seg;k++){const a=i*R+k,b=a+1,c2=a+R,d=c2+1;idx.push(a,c2,b,b,c2,d);}
 const c0=pos.length/3;pos.push(secs[0].x,secs[0].y||0,0);uv.push(0,0);pos.push(secs[n-1].x,secs[n-1].y||0,0);uv.push(2,0);
 for(let k=0;k<seg;k++){idx.push(c0,k,k+1);idx.push(c0+1,(n-1)*R+k+1,(n-1)*R+k);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function wingGeo(pts,t,sd){
 const sh=new THREE.Shape();pts.forEach((p,i)=>i?sh.lineTo(p[0],p[1]*sd):sh.moveTo(p[0],p[1]*sd));sh.closePath();
 const g=new THREE.ExtrudeGeometry(sh,{depth:t,bevelEnabled:true,bevelThickness:t*.35,bevelSize:t*.5,bevelSegments:1,steps:1});
 g.translate(0,0,-t/2);g.rotateX(PI/2);return g;
}
function finGeo(pts,t){
 const sh=new THREE.Shape();pts.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));sh.closePath();
 const g=new THREE.ExtrudeGeometry(sh,{depth:t,bevelEnabled:true,bevelThickness:t*.3,bevelSize:t*.4,bevelSegments:1,steps:1});
 g.translate(0,0,-t/2);return g;
}
function nacGeo(len,r){
 const pts=[[r*.62,0],[r*.82,len*.02],[r,len*.14],[r,len*.66],[r*.72,len*.9],[r*.3,len]].map(p=>new THREE.Vector2(p[0],p[1]));
 return new THREE.LatheGeometry(pts,12).rotateZ(-PI/2);
}
function nozGeo(len,r){
 const pts=[[r*.92,0],[r,len*.15],[r*.84,len],[r*.72,len],[r*.78,len*.1]].map(p=>new THREE.Vector2(p[0],p[1]));
 return new THREE.LatheGeometry(pts,14).rotateZ(PI/2);
}
function kit(){
 const P={paint:[],trim:[],metal:[],dark:[],glass:[],accent:[],glow:[]};
 const add=(k,g,x,y,z,rx,ry,rz,sx,sy,sz)=>{const q=g.index?g.toNonIndexed():g.clone();if(sx!==undefined)q.scale(sx,sy,sz);if(rx)q.rotateX(rx);if(ry)q.rotateY(ry);if(rz)q.rotateZ(rz);q.translate(x||0,y||0,z||0);P[k].push(q);};
 const sym=(k,g,x,y,z,rx,ry,rz,sx,sy,sz)=>{add(k,g,x,y,z,rx,ry,rz,sx,sy,sz);add(k,g,x,y,-z,rx?-rx:0,ry?-ry:0,rz,sx,sy,sz);};
 const bake=()=>{const geo={};for(const k in P){geo[k]=P[k].length?BGU.mergeGeometries(P[k],false):null;for(const q of P[k])q.dispose();}return geo;};
 return{P,add,sym,bake};
}
const designs={};
/* designShip: procedural airframe built at unit size (radius 1). Role sets the silhouette, tier adds mass and detail.
   Every part is either on the centreline or placed as a mirrored pair. */
function designShip(idx){
 if(designs[idx])return designs[idx];
 const role=idx%3,tier=idx/3|0,rnd=mulberry32(idx*977+5),L=1+tier*.06,SP=1+tier*.05,K=kit(),add=K.add,sym=K.sym,eng=[];
 const bw=[.17,.25,.34][role],bh=[.13,.16,.21][role],nx=[1.15,1.05,.95][role]*L,ex=[2.4,2.8,4.6][role];
 /* fuselage stations: [u along hull, width, height, vertical offset] */
 const S=[
  [[-.95,.55,.55,0],[-.8,.8,.85,0],[-.5,.98,1,0],[-.15,1,1.05,.02],[.2,.9,1,.03],[.5,.7,.8,.02],[.75,.45,.5,0],[.92,.2,.22,-.01],[1,.04,.05,-.02]],
  [[-.95,.7,.7,0],[-.75,.95,.92,0],[-.4,1,1,0],[-.05,1,1.08,.03],[.3,.88,1,.04],[.55,.66,.78,.02],[.78,.44,.52,0],[.94,.2,.24,-.01],[1,.06,.08,-.02]],
  [[-.95,.8,.8,0],[-.75,1,1,0],[-.3,1,1.05,0],[.1,1,1.1,.03],[.45,.88,.98,.03],[.75,.66,.76,.01],[.92,.48,.56,0],[1,.36,.42,0]]
 ][role];
 const X=u=>u<0?u*L:u*nx;
 const at=u=>{let i=0;while(i<S.length-2&&S[i+1][0]<u)i++;const a=S[i],b=S[i+1],t=clamp((u-a[0])/(b[0]-a[0]),0,1);return[lerp(a[1],b[1],t),lerp(a[2],b[2],t),lerp(a[3],b[3],t)];};
 const top=u=>{const q=at(u);return bh*(q[1]+q[2]);},bot=u=>{const q=at(u);return bh*(q[2]-q[1]*.7);};
 const st=(u,k)=>{const q=at(u);return{x:X(u),w:bw*q[0]*k,h:bh*q[1]*k,y:bh*q[2]};};
 add('paint',loft(S.map(s=>st(s[0],1)),20,ex,.7));
 add('trim',loft(S.slice(-3).map(s=>st(s[0],1.035)),20,ex,.7));                 /* nose cone */
 add('trim',loft([st(-.63,1.03),st(-.56,1.03)],20,ex,.7));                        /* tail band */
 /* cockpit: glass, frame hoops, dorsal fairing running back to the tail */
 const cx=X(.42),cy=top(.42)*.84,cl=.27*L,ch2=bh*.52,cw2=bw*.44;
 add('glass',GEO.sph,cx,cy,0,0,0,0,cl,ch2,cw2);
 for(const dx of[-.5,.05,.55]){const k=Math.sqrt(1-dx*dx)*1.05;add('dark',GEO.hoop,cx+dx*cl,cy,0,0,0,0,.3,ch2*k,cw2*k);}
 add('paint',loft([{x:X(-.82),w:bw*.14,h:bh*.22,y:top(-.82)*.78},{x:X(-.4),w:bw*.3,h:bh*.4,y:top(-.4)*.8},{x:cx-cl*.55,w:bw*.4,h:bh*.48,y:cy*.94}],12,2.2,1));
 /* air intakes */
 if(role===0){add('paint',GEO.box,X(.16),bot(.16)-bh*.08,0,0,0,0,.42*L,bh*.42,bw*.86);add('dark',GEO.box,X(.16)+.21*L,bot(.16)-bh*.08,0,0,0,0,.02,bh*.3,bw*.7);add('trim',GEO.box,X(.16)+.2*L,bot(.16)-bh*.08,0,0,0,0,.03,bh*.46,bw*.92);}
 else{const iu=role===1?.1:.2,ih=bh*(role===1?.85:.9),iw=bw*(role===1?.4:.36),iz=bw*.97,iy=-bh*.18,il=.52*L;
  sym('paint',GEO.box,X(iu),iy,iz,0,0,0,il,ih,iw);sym('dark',GEO.box,X(iu)+il/2,iy,iz,0,0,0,.02,ih*.78,iw*.74);sym('trim',GEO.box,X(iu)+il/2-.015,iy,iz,0,0,0,.035,ih*1.06,iw*1.08);}
 /* wings: skin, leading-edge strip, control-surface hinge line */
 const wt=[.03,.04,.06][role];
 WINGS[role].forEach((w,wi)=>{
  const k=wi?1:SP,wy=wi?bh*.25:-bh*.12,P4=w.map(p=>[p[0]*L,p[1]*k]);
  const le=[P4[0],P4[1],[P4[1][0]-.07,P4[1][1]],[P4[0][0]-.09,P4[0][1]]];
  const hg=[[P4[3][0]+.13,P4[3][1]],[P4[2][0]+.1,P4[2][1]*.97],[P4[2][0]+.085,P4[2][1]*.97],[P4[3][0]+.115,P4[3][1]]];
  for(const sd of[1,-1]){add('paint',wingGeo(P4,wt,sd),0,wy,0);add('trim',wingGeo(le,wt*1.12,sd),0,wy,0);if(!wi)add('dark',wingGeo(hg,wt*1.08,sd),0,wy,0);}
 });
 const tip=WINGS[role][0][1],tipx=(tip[0]-.12)*L,tipz=tip[1]*SP;
 /* tail fins with tip caps and rudder lines */
 const fin=[[-.42,0],[-.92,.4],[-1.06,.4],[-.92,0]],ftip=[[-.845,.34],[-.92,.4],[-1.06,.4],[-1.039,.34]],rud=[[-.9,.02],[-1.02,.33],[-1.035,.33],[-.915,.02]];
 const finAt=(f,y,z,rx,t)=>{const m=q=>q.map(p=>[p[0]*L,p[1]*f]);add('paint',finGeo(m(fin),t),0,y,z,rx);add('trim',finGeo(m(ftip),t*1.25),0,y,z,rx);add('dark',finGeo(m(rud),t*1.12),0,y,z,rx);};
 if(role===0)finAt(1+tier*.06,bh*.6,0,0,.03);
 else for(const sd of[1,-1])finAt(role===2?1.12:.94,bh*.5,sd*bw*.56,sd*.34,.035);
 if(role===2)add('paint',finGeo([[-.5*L,0],[-.86*L,-.2],[-.98*L,-.2],[-.9*L,0]],.035),0,-bh*.4,0);
 /* engines: nacelle, intake ring, flared nozzle with recessed glow */
 const ne=[1,2,3][role]+(tier>>1),er=[.1,.105,.11][role]*(ne>3?.86:1),span=bw*(ne>2?2.3:1.5),nac=nacGeo(.62,er),noz=nozGeo(.16,er);
 for(let j=0;j<ne;j++){
  const z=ne===1?0:(j/(ne-1)-.5)*span,y=(ne>2&&Math.floor(Math.abs(j-(ne-1)/2)+.5)%2===0)?bh*.3:0,x=-1.04*L;
  add('metal',nac,x,y,z);add('dark',noz,x+.01,y,z);add('glow',GEO.disc,x-.07,y,z,0,-PI/2,0,er*.66,er*.66,1);
  add('dark',GEO.cylX,x+.32,y,z,0,0,0,.05,er*1.07,er*1.07);add('trim',GEO.cylX,x+.14,y,z,0,0,0,.03,er*1.05,er*1.05);
  eng.push([x-.1,y,z,er*.62]);
 }
 nac.dispose();noz.dispose();
 /* guns: barrel, muzzle brake, breech fairing */
 const gun=(x0,len,y,z,r,pair)=>{const f=pair?sym:add;f('dark',GEO.cylX,x0+len/2,y,z,0,0,0,len,r,r);f('metal',GEO.cylX,x0+len-.03,y,z,0,0,0,.07,r*1.6,r*1.6);f('metal',GEO.cylX,x0+.07,y,z,0,0,0,.16,r*2,r*2);};
 if(role===0){gun(nx*.88-.25,.5,-bh*.1,0,.02,false);if(tier>1)gun(.1*L-.25,.5,-bh*.12-.03,bw*1.5,.018,true);}
 if(role===1){gun(X(.1)-.05,.72,-bh*.3,bw*1.24,.025,true);add('metal',GEO.cylX,nx+.07,-bh*.02,0,0,0,0,.18,.006,.006);
  if(tier>1){add('metal',GEO.box,X(.7),bot(.7)-bh*.06,0,0,0,0,.22,bh*.2,bw*.3);gun(X(.7)-.04,.36,bot(.7)-bh*.1,0,.022,false);}}
 if(role===2){gun(.11*L,.82,bh*.1,bw*.82,.036,true);add('metal',GEO.box,X(.55),bot(.55)-bh*.04,0,0,0,0,.3,.1,.2);gun(X(.55)+.02,.42,bot(.55)-bh*.08,0,.028,false);}
 /* sensors and small fittings */
 add('dark',finGeo([[X(-.25),0],[X(-.25)-.05,-.07],[X(-.25)-.09,-.07],[X(-.25)-.09,0]],.012),0,bot(-.25)+.005,0);
 if(tier>=2)add('dark',GEO.sph,X(.68),top(.68)*.96,0,0,0,0,.035,.03,.035);
 sym('dark',GEO.box,X(.72),bh*at(.72)[2],bw*at(.72)[0]*.98,0,0,0,.05,.03,.02);
 /* missile pods hung under the wing at its real chord */
 {const wp=WINGS[role][0],wy=-bh*.12;for(let p=0;p<Math.min(tier,3);p++){const zz=bw+.2+p*.2,t=(zz/SP-wp[0][1])/(wp[1][1]-wp[0][1]);if(t<0||t>.85)continue;const le=lerp(wp[0][0],wp[1][0],t)*L,te=lerp(wp[3][0],wp[2][0],t)*L,len=Math.min(.36,(le-te)*.75),xc=(le+te)/2;sym('metal',GEO.cylX,xc,wy-.07,zz,0,0,0,len,.032,.032);sym('trim',GEO.cylX,xc+len*.42,wy-.07,zz,0,0,0,len*.14,.033,.033);sym('dark',GEO.box,xc,wy-.035,zz,0,0,0,len*.4,.05,.04);sym('accent',GEO.sph,xc+len/2,wy-.07,zz,0,0,0,.028,.028,.028);}}
 /* hull fittings beside the dorsal fairing, mirrored and seated on the skin */
 for(let i=0;i<1+tier;i++){const u=lerp(-.62,-.12,rnd()),q=at(u),gz=bw*q[0]*(.5+rnd()*.25),gy=bh*q[2]+bh*q[1]*.97*Math.pow(1-Math.pow(gz/(bw*q[0]),ex),1/ex);sym(rnd()<.5?'metal':'dark',GEO.box,X(u),gy,gz,0,0,0,.06+rnd()*.12,.03+rnd()*.03,.04+rnd()*.05);}
 /* lights */
 sym('accent',GEO.sph,tipx,0,tipz,0,0,0,.034,.034,.034);
 add('accent',GEO.sph,X(-.9),top(-.9)*.55,0,0,0,0,.03,.03,.03);
 if(tier>=2)sym('accent',GEO.box,X(-.3),bh*.45,bw*at(-.3)[0]*.99,0,0,0,.22,.02,.012);
 if(tier>=3){const wte=WINGS[role][0][2][0]*L,wle=Math.min(tip[0]*L,wte+.42),wl=finGeo([[wle,0],[wte+(wle-wte)*.35,.22],[wte-.03,.22],[wte,0]],.025);add('paint',wl,0,0,tipz);add('paint',wl,0,0,-tipz);wl.dispose();}
 if(tier>=4){sym('trim',GEO.box,X(-.46),bh*.12,bw*1.01,0,0,0,.46*L,bh*.8,.03);add('dark',GEO.sph,X(-.52),top(-.52)*.8+bh*.42,0,0,0,0,.09,.05,.09);sym('paint',GEO.box,X(-.6),bh*.3,bw*1.22,0,0,0,.42,.12,.1);}
 return designs[idx]={geo:K.bake(),eng,L};
}
function designCargo(){
 if(designs.cargo)return designs.cargo;
 const K=kit(),add=K.add,sym=K.sym,eng=[];
 add('metal',GEO.box,0,0,0,0,0,0,2,.22,.3);
 for(let i=0;i<3;i++){add('paint',GEO.box,-.6+i*.5,.04,0,0,0,0,.44,.5,.94);add('dark',GEO.box,-.6+i*.5,.3,0,0,0,0,.4,.03,.84);add('dark',GEO.box,-.35+i*.5,.02,0,0,0,0,.04,.44,.8);}
 add('paint',GEO.box,.92,.1,0,0,0,0,.36,.4,.6);add('glass',GEO.box,1.08,.2,0,0,0,0,.06,.12,.46);add('metal',GEO.box,.9,.34,0,0,0,0,.2,.08,.3);
 const nac=nacGeo(.5,.12);
 for(const z of[-.26,.26]){add('metal',nac,-1.24,0,z);add('glow',GEO.disc,-1.21,0,z,0,-PI/2,0,.09,.09,1);eng.push([-1.24,0,z,.09]);}
 nac.dispose();
 sym('accent',GEO.sph,-.84,.3,.44,0,0,0,.035,.035,.035);sym('accent',GEO.sph,.66,.3,.44,0,0,0,.035,.035,.035);add('accent',GEO.sph,1.02,.42,0,0,0,0,.04,.04,.04);
 return designs.cargo={geo:K.bake(),eng,L:1.1};
}

/* ---------- materials ---------- */
const MT={
 metal:new THREE.MeshStandardMaterial({color:0x5a616b,metalness:.85,roughness:.42,envMapIntensity:.9,side:THREE.DoubleSide}),
 dark:new THREE.MeshStandardMaterial({color:0x1b1e23,metalness:.6,roughness:.55,envMapIntensity:.7,side:THREE.DoubleSide}),
 glass:new THREE.MeshStandardMaterial({color:0x0b1a2a,metalness:.95,roughness:.06,envMapIntensity:1.6,emissive:0x16344e,emissiveIntensity:.35}),
 char:new THREE.MeshStandardMaterial({color:0x26221f,metalness:.3,roughness:.9,envMapIntensity:.3,emissive:0x5a1c06,emissiveIntensity:.5,side:THREE.DoubleSide}),
 rock:new THREE.MeshStandardMaterial({color:0x7a7066,metalness:.05,roughness:1,flatShading:true,vertexColors:true,envMapIntensity:.25}),
 rockOre:new THREE.MeshStandardMaterial({color:0xa8794a,metalness:.6,roughness:.5,flatShading:true,vertexColors:true,envMapIntensity:.7}),
 moon:new THREE.MeshStandardMaterial({color:0xb4b0a8,map:moonTex,bumpMap:moonTex,bumpScale:2.5,metalness:0,roughness:.95,envMapIntensity:.2}),
 stHull:new THREE.MeshStandardMaterial({color:0x9aa2ac,map:panelTex,roughnessMap:panelTex,metalness:.6,roughness:.75,envMapIntensity:.7}),
 solar:new THREE.MeshStandardMaterial({color:0xffffff,map:solarTex,metalness:.7,roughness:.25,envMapIntensity:1.2,emissive:0x0a1a40,emissiveIntensity:.6}),
 brace:new THREE.MeshBasicMaterial({color:new THREE.Color(2.6,1.2,.3),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),
 slow:new THREE.MeshBasicMaterial({color:new THREE.Color(1.6,.8,2.4),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),
 gold:new THREE.MeshBasicMaterial({color:new THREE.Color(1.9,1.4,.2),side:THREE.BackSide}),
 elite:new THREE.MeshBasicMaterial({color:new THREE.Color(1.5,.5,2.2),side:THREE.BackSide}),
 win:new THREE.MeshStandardMaterial({color:0x201a10,emissive:0xffdf9a,emissiveIntensity:1.4}),
 rad:new THREE.MeshStandardMaterial({color:0x2a2420,emissive:0xff6a20,emissiveIntensity:.7,metalness:.4,roughness:.6,side:THREE.DoubleSide}),
 debris:new THREE.MeshStandardMaterial({color:0x6a6258,metalness:.5,roughness:.6,flatShading:true})
};
const matCache={};
function paintMat(hex,pl){const key=(pl?'P':'p')+hex;let m=matCache[key];if(!m){
  if(!pl){const c=new THREE.Color(hex).lerp(new THREE.Color(0x808080),.28);m=new THREE.MeshStandardMaterial({color:c,map:panelTex,roughnessMap:panelTex,bumpMap:panelTex,bumpScale:.45,metalness:.42,roughness:.82,envMapIntensity:.75,side:THREE.DoubleSide});}
  else{/* player paint: full colour, a touch more saturation, glossier finish; Chrome is a mirror finish */
   const h=HULLS.find(x=>x.c===hex),chrome=h&&h.fin==='chrome',c=new THREE.Color(hex),hsl={};c.getHSL(hsl);c.setHSL(hsl.h,Math.min(1,hsl.s*1.15),hsl.l);
   m=chrome?new THREE.MeshStandardMaterial({color:c,bumpMap:panelTex,bumpScale:.25,metalness:1,roughness:.16,envMapIntensity:1.6,side:THREE.DoubleSide})
    :new THREE.MeshStandardMaterial({color:c,map:panelTex,bumpMap:panelTex,bumpScale:.4,metalness:.3,roughness:.48,envMapIntensity:1.05,side:THREE.DoubleSide});}
  matCache[key]=m;}return m;}
function trimMat(hex){let m=matCache['t'+hex];if(!m){const c=new THREE.Color(hex).lerp(new THREE.Color(0x808080),.28).lerp(new THREE.Color(0x14171c),.6);m=matCache['t'+hex]=new THREE.MeshStandardMaterial({color:c,map:panelTex,roughnessMap:panelTex,metalness:.5,roughness:.7,envMapIntensity:.8,side:THREE.DoubleSide});}return m;}
function accMat(hex){let m=matCache['a'+hex];if(!m)m=matCache['a'+hex]=new THREE.MeshStandardMaterial({color:0x101010,emissive:new THREE.Color(hex),emissiveIntensity:2.6});return m;}
function glowMat(hex){let m=matCache['g'+hex];if(!m){const c=new THREE.Color(hex).lerp(new THREE.Color(0xffffff),.35).multiplyScalar(2.6);m=matCache['g'+hex]=new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide});}return m;}
function flameMat(hex,pl){const key=(pl?'F':'f')+hex;let m=matCache[key];if(!m){const c=new THREE.Color(hex).multiplyScalar(pl?1.9:1.15);m=matCache[key]=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:pl?.95:.7,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});}return m;}
const FRES_V='varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
const FRES_F='uniform vec3 col;uniform float op;uniform float pw;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),pw);gl_FragColor=vec4(col*(0.45+f*1.7),(0.04+f)*op);}';
function fresMat(hex,op,pw){return new THREE.ShaderMaterial({uniforms:{col:{value:new THREE.Color(hex)},op:{value:op},pw:{value:pw||2.4}},vertexShader:FRES_V,fragmentShader:FRES_F,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});}
const WELL_F='uniform float t;varying vec2 vUv;void main(){float d=length(vUv-0.5)*2.0;if(d>1.0)discard;float w=sin(d*42.0+t*2.2)*0.5+0.5;float a=pow(w,6.0)*smoothstep(0.34,0.55,d)*(1.0-d)*0.55;gl_FragColor=vec4(vec3(0.55,0.75,1.0),a);}';
const wellMat=new THREE.ShaderMaterial({uniforms:{t:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:WELL_F,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});

/* ---------- floor ("tabletop") ---------- */
const floorMat=new THREE.MeshStandardMaterial({color:0xa8a8a8,roughness:1,metalness:0,envMapIntensity:0});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(26000,26000),floorMat);floor.rotation.x=-PI/2;floor.position.y=FLOOR;floor.receiveShadow=true;scene.add(floor);floor.visible=false;
let floorSea=-1;
function setSector(sea){
 if(sea===floorSea)return;floorSea=sea;const old=floorMat.map,t=canvasTex(makeBgTile(sea,settings.gfx==='low'?1024:2048),true);t.repeat.set(8,8);
 floorMat.map=t;floorMat.emissiveMap=t;floorMat.emissive.set(0xffffff);floorMat.emissiveIntensity=.46;floorMat.needsUpdate=true;if(old)old.dispose();
}

/* ---------- object builders ---------- */
function shipObj(s){
 const d=s.cargo?designCargo():designShip(s.idx),g=new THREE.Group(),b=new THREE.Group();g.add(b);
 const acc=s.isPlayer?s.trail:s.cargo?'#ffd27a':s.team?'#ff4030':'#4fffd8';
 const mk=(geo,mat,shadow)=>{if(!geo)return;const m=new THREE.Mesh(geo,mat);m.castShadow=shadow;m.receiveShadow=shadow;b.add(m);};
 const pl=!!s.isPlayer&&!s.cargo,pm=paintMat(s.hull,pl).clone(),own=[pm];
 let am=accMat(acc),gm=glowMat(s.trail),fm=flameMat(s.trail,pl),rim=null;
 if(s.prism){am=am.clone();gm=gm.clone();fm=fm.clone();own.push(am,gm,fm);}
 mk(d.geo.paint,pm,true);mk(d.geo.trim,trimMat(s.trim||s.hull),true);mk(d.geo.metal,MT.metal,true);mk(d.geo.dark,MT.dark,true);mk(d.geo.glass,MT.glass,false);mk(d.geo.accent,am,false);mk(d.geo.glow,gm,false);
 /* player glow outline in the trail colour, so you never mix yourself up with enemies */
 if(pl&&d.geo.paint&&settings.glow!==false){rim=fresMat(s.trail,1.15,1.5);own.push(rim);const rm=new THREE.Mesh(d.geo.paint,rim);rm.scale.setScalar(1.07);b.add(rm);}
 const fl=[];for(const e of d.eng){const f=new THREE.Mesh(GEO.flame,fm);f.position.set(e[0],e[1],e[2]);b.add(f);fl.push([f,e[3]]);}
 const sm=fresMat(s.team?0xff7a66:0x7de3ff,0,2.4),sh=new THREE.Mesh(GEO.sphMid,sm);sh.scale.set(1.42*d.L,.9,1.42);sh.visible=false;g.add(sh);
 const bub=new THREE.Mesh(GEO.sphMid,new THREE.MeshBasicMaterial({color:0x7dffd8,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));bub.scale.set(2.6,1.9,2.6);bub.visible=false;g.add(bub);
 const br=new THREE.Mesh(GEO.arc,MT.brace);br.visible=false;g.add(br);
 const sl=new THREE.Mesh(GEO.ringThin,MT.slow);sl.visible=false;g.add(sl);
 if((s.marked||s.elite)&&d.geo.paint){const ol=new THREE.Mesh(d.geo.paint,s.marked?MT.gold:MT.elite);ol.scale.setScalar(1.1);b.add(ol);}
 own.push(sm);
 return{o:g,b,fl,sh,br,sl,pm,own,pl,bubble:bub,pr:s.prism?{am,gm,fm,rim}:null};
}
/* Prism trail: recolour this ship's own engine materials each frame */
function prismPaint(o,hex){const p=o.pr;if(!p)return;const c=new THREE.Color(hex);p.am.emissive.copy(c);p.fm.color.copy(c).multiplyScalar(1.9);p.gm.color.copy(c).lerp(new THREE.Color(0xffffff),.35).multiplyScalar(2.6);if(p.rim)p.rim.uniforms.col.value.copy(c);}
function updShip(o,s){
 const g=o.o;g.visible=!(window.cockpitOn&&s.isPlayer);g.position.set(s.x,s.z*ALT,s.y);g.rotation.y=-s.ang;o.b.rotation.x=s.bank*.95+(s.roll>0?(1-s.roll/20)*PI*2*s.rollDir:0);g.scale.setScalar(s.r);o.pm.emissive.setScalar(s.flash>0?.55:0);
 if(o.pr)prismPaint(o,s.trail);
 const on=s.thr>.04;for(const f of o.fl){f[0].visible=on;if(on){const len=(.2+s.thr*1.25)*(.82+Math.random()*.36)*(o.pl?1.3:1);f[0].scale.set(len,f[1]*(o.pl?1.15:1),f[1]*(o.pl?1.15:1));}}
 const fr=s.maxSh>0?Math.min(1,s.sh/s.maxSh):0,fx=Math.max(0,s.shF||0);
 o.sh.visible=!window.__cineHideHud&&(fr>.01||fx>0);if(o.sh.visible)o.sh.material.uniforms.op.value=fr*.06+fx*.95;
 o.br.visible=s.brace>0;if(o.br.visible){const k=1+Math.sin(frameNo*.5)*.06;o.br.scale.setScalar(k);}
 o.sl.visible=s.slow>0;if(o.sl.visible)o.sl.rotation.y+=.22;
 if(o.bubble){const guard=s.team===1&&typeof projectorGuard==='function'&&projectorGuard(s);o.bubble.visible=!window.__cineHideHud&&(s.special==='shield'||guard);if(o.bubble.visible)o.bubble.material.opacity=.07+Math.sin(frameNo*.05)*.02+(s.special==='shield'?.04:0);}
}
function wreckObj(w){
 const d=w.cargo?designCargo():designShip(w.idx),g=new THREE.Group();
 for(const k of['paint','trim','metal','dark'])if(d.geo[k]){const m=new THREE.Mesh(d.geo[k],MT.char);m.castShadow=true;g.add(m);}
 return{o:g};
}
function updWreck(o,w){const f=w.life/w.max,g=o.o;g.position.set(w.x,w.z*ALT-(1-f)*70,w.y);g.rotation.set(w.tx,-w.ang,w.tz);g.scale.setScalar(w.r*Math.min(1,f*2.4));}
/* station: hex core with a windowed team band and docking bays, three trussed solar arms with radiators,
   a rotating habitat ring on spokes, three tracking turrets, a comms mast with a turning dish, and a reactor below.
   Static parts are merged per material so the whole station is only a handful of draw calls. */
function stationObj(st){
 const g=new THREE.Group(),col=new THREE.Color(st.team?0xff4a38:0x4fffd8),own=[];
 const em=new THREE.MeshStandardMaterial({color:0x101010,emissive:col,emissiveIntensity:1.5});
 const bl=new THREE.MeshStandardMaterial({color:0x101010,emissive:col,emissiveIntensity:2.5});
 const tm=new THREE.MeshStandardMaterial({color:new THREE.Color(st.team?0x8a2a24:0x2a8a7a),map:panelTex,roughnessMap:panelTex,metalness:.5,roughness:.7,envMapIntensity:.7});
 own.push(em,bl,tm);
 const glow=new Set([em,bl,MT.win,MT.rad]);
 const P=(body,mat,geo,x,y,z,ry,rx,pm)=>{
  dummy.position.set(x||0,y||0,z||0);dummy.rotation.set(rx||0,ry||0,0,'YXZ');dummy.scale.set(1,1,1);dummy.updateMatrix();
  let q=geo;if(geo.index){q=geo.toNonIndexed();geo.dispose();}
  q.applyMatrix4(dummy.matrix);if(pm)q.applyMatrix4(pm);
  let b=body.get(mat);if(!b)body.set(mat,b=[]);b.push(q);
 };
 const flush=(body,parent)=>{for(const e of body){const mg=BGU.mergeGeometries(e[1],false);for(const q of e[1])q.dispose();const m=new THREE.Mesh(mg,e[0]);m.castShadow=m.receiveShadow=!glow.has(e[0]);parent.add(m);own.push(mg);}};
 const C=(a,b,h,n)=>new THREE.CylinderGeometry(a,b,h,n),B=(w,h,d)=>new THREE.BoxGeometry(w,h,d),SP=(r)=>new THREE.SphereGeometry(r,12,8);
 const S0=new Map(),R0=new Map();
 /* core stack */
 P(S0,MT.stHull,C(26,34,22,6));P(S0,tm,C(27.6,27.6,5,6),0,13.5,0);P(S0,MT.stHull,C(13,22,10,6),0,21,0);P(S0,MT.metal,C(10,12.5,5,12),0,28.5,0);
 P(S0,MT.metal,C(22,10,14,6),0,-18,0);P(S0,MT.dark,SP(8.5),0,-27,0);P(S0,em,C(4.5,3,3,10),0,-35.5,0);
 P(S0,em,new THREE.TorusGeometry(27.9,.7,6,6).rotateX(PI/2).rotateY(PI/6),0,16.3,0);
 P(S0,em,new THREE.TorusGeometry(13.4,.6,6,6).rotateX(PI/2).rotateY(PI/6),0,26.2,0);
 for(let f=0;f<6;f++){
  const t=(f+.5)*PI/3,sn=Math.sin(t),cs=Math.cos(t);
  for(const k of[-7.5,-2.5,2.5,7.5])P(S0,MT.win,B(2.6,1.6,.6),sn*24+cs*k,13.5,cs*24-sn*k,t);   /* window row on the band */
  if(f%2){P(S0,MT.dark,B(13,8,1),sn*26.2,0,cs*26.2,t,-.35);P(S0,em,B(14,.7,.8),sn*24.5,4.9,cs*24.5,t,-.35);P(S0,em,B(14,.7,.8),sn*28,-4.9,cs*28,t,-.35);}  /* docking bay */
 }
 /* comms mast */
 P(S0,MT.dark,C(1.1,1.5,18,6),0,40,0);for(const sd of[1,-1])P(S0,MT.dark,C(.25,.25,11,4),sd*3,36.5,0);P(S0,bl,SP(2.2),0,50,0);
 /* solar arms */
 for(let i=0;i<3;i++){
  const pm=new THREE.Matrix4().makeRotationY(-armA(i));
  P(S0,MT.metal,B(36,3,3),40,-2,0,0,0,pm);for(const ax of[26,38,50])P(S0,MT.dark,B(1.6,4.6,4.6),ax,-2,0,0,0,pm);
  for(const sd of[1,-1]){P(S0,MT.solar,B(22,.8,13),47,-1.5,sd*9.6,0,sd*.14,pm);P(S0,MT.metal,B(.9,1.3,13.4),35.8,-1.5,sd*9.6,0,sd*.14,pm);P(S0,MT.metal,B(.9,1.3,13.4),58.2,-1.5,sd*9.6,0,sd*.14,pm);P(S0,MT.metal,B(22.6,1.2,.9),47,-1.5,sd*2.9,0,0,pm);}
  P(S0,MT.rad,B(9,7,.5),29,4.6,0,0,0,pm);P(S0,bl,SP(1.7),59.6,-2,0,0,0,pm);
 }
 flush(S0,g);
 /* rotating habitat ring */
 const ring=new THREE.Group();ring.position.y=-12;g.add(ring);
 P(R0,MT.metal,new THREE.TorusGeometry(40,2,8,48).rotateX(PI/2));
 for(let i=0;i<6;i++){
  const a=i/6*PI*2,a2=a+PI/6;
  P(R0,MT.dark,B(21,1.2,1.2),Math.cos(a)*29.5,0,Math.sin(a)*29.5,-a);
  P(R0,MT.stHull,B(9,5,6),Math.cos(a2)*40,0,Math.sin(a2)*40,-a2);P(R0,MT.win,B(6.5,1.1,6.3),Math.cos(a2)*40,.6,Math.sin(a2)*40,-a2);
 }
 flush(R0,ring);
 /* turrets on the shoulder of the core */
 const tur=[];
 for(let i=0;i<3;i++){
  const a=turA(i),base=new THREE.Group(),bb=new Map(),pb=new Map();base.position.set(Math.cos(a)*24,17.5,Math.sin(a)*24);g.add(base);
  P(bb,MT.dark,C(4.5,5.6,4,10));flush(bb,base);
  const piv=new THREE.Group();piv.position.y=3.6;base.add(piv);
  P(pb,MT.metal,B(7.5,4.2,6.5),1,0,0);for(const sd of[1,-1]){P(pb,MT.dark,B(15,1.5,1.5),10.5,.5,sd*1.9);P(pb,MT.metal,B(2.4,2.1,2.1),17.5,.5,sd*1.9);}
  flush(pb,piv);tur.push(piv);
 }
 /* turning dish */
 const dishG=new THREE.Group();dishG.position.y=33;g.add(dishG);
 const dg=new THREE.LatheGeometry([[0,0],[3,.6],[5.6,2.2],[7,3.6]].map(p=>new THREE.Vector2(p[0],p[1])),16),dm=new THREE.Mesh(dg,MT.metal);dm.position.set(7.5,1,0);dm.rotation.z=-.7;dm.castShadow=true;dishG.add(dm);own.push(dg);
 const fg=C(.3,.3,5,4),fm=new THREE.Mesh(fg,MT.dark);fm.position.set(9.2,3,0);fm.rotation.z=-.7;dishG.add(fm);own.push(fg);
 /* defense-field ring at ship height, soft glow on the floor */
 const am=new THREE.MeshBasicMaterial({color:col.clone().multiplyScalar(1.2),transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),ag=new THREE.RingGeometry(st.aura-1.2,st.aura,120).rotateX(-PI/2),au=new THREE.Mesh(ag,am);au.position.y=-6;g.add(au);
 const flm=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.09,blending:THREE.AdditiveBlending,depthWrite:false}),flg=new THREE.CircleGeometry(st.aura*1.06,72).rotateX(-PI/2),fd=new THREE.Mesh(flg,flm);fd.position.y=FLOOR+3;fd.visible=false;g.add(fd);
 own.push(am,ag,flm,flg);
 dummy.rotation.set(0,0,0,'XYZ');
 g.position.set(st.x,-6,st.y);
 return{o:g,ring,tur,au,bl,dish:dishG,own};
}
function updStation(o,st){
 o.ring.rotation.y=-st.rot;o.dish.rotation.y=st.rot*2.2;for(let i=0;i<3;i++){o.tur[i].rotation.y=-st.turrets[i].ang;o.tur[i].visible=!st.turrets[i].dead;}
 o.au.material.opacity=window.__cineHideHud?0:(.1+Math.sin(frameNo*.05)*.03);o.au.visible=!window.__cineHideHud&&!st.genDead;o.bl.emissiveIntensity=frameNo%70<12?4.5:.35;
}
/* black hole: dark core, glowing rim, rotating accretion disk */
function blackHoleObj(g){
 const root=new THREE.Group();
 const core=new THREE.Mesh(GEO.sphHi,new THREE.MeshBasicMaterial({color:0x000000}));
 core.scale.setScalar(g.r);root.add(core);
 const rm=fresMat(0xff8a3a,.95,3.2),rim=new THREE.Mesh(GEO.sphHi,rm);rim.scale.setScalar(g.r*1.02);root.add(rim);
 const dc=mkCanvas(256,256),dx=dc.getContext('2d');
 const gr=dx.createRadialGradient(128,128,18,128,128,127);
 gr.addColorStop(0,'rgba(255,235,190,.95)');gr.addColorStop(.32,'rgba(255,160,70,.8)');gr.addColorStop(.66,'rgba(200,60,20,.32)');gr.addColorStop(1,'rgba(120,20,10,0)');
 dx.fillStyle=gr;dx.fillRect(0,0,256,256);
 const dt=new THREE.CanvasTexture(dc);dt.colorSpace=THREE.SRGBColorSpace;
 const dmat=new THREE.MeshBasicMaterial({map:dt,transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
 const disk=new THREE.Mesh(GEO.pring,dmat);disk.scale.setScalar(g.r*2.6);disk.rotation.x=Math.PI*.08;root.add(disk);
 root.position.set(g.x,0,g.y);
 return{o:root,sp:core,cl:null,own:[rm,dt,dmat],bh:disk};
}
function planetObj(g){
 if(g.bh)return blackHoleObj(g);
 const root=new THREE.Group(),body=new THREE.Group(),tilt=new THREE.Group(),pt=planetTex(g),tex=pt.map,own=[tex];
 const m=new THREE.MeshStandardMaterial({map:tex,roughness:g.gas?.75:1,metalness:0,envMapIntensity:g.gas?.2:.3});if(pt.aux){m.roughnessMap=pt.aux;m.bumpMap=pt.aux;m.bumpScale=3;own.push(pt.aux);}own.push(m);
 const sp=new THREE.Mesh(GEO.sphHi,m);sp.castShadow=true;sp.receiveShadow=true;sp.rotation.y=g.rot;tilt.add(sp);
 const am=fresMat(new THREE.Color(g.c1).lerp(new THREE.Color(0xbfe0ff),.5).getHex(),.55,2.6),at=new THREE.Mesh(GEO.sphHi,am);at.scale.setScalar(1.045);tilt.add(at);own.push(am);
 const hm=fresMat(new THREE.Color(g.c1).lerp(new THREE.Color(0xbfe0ff),.6).getHex(),.16,5),ha=new THREE.Mesh(GEO.sphHi,hm);ha.scale.setScalar(1.12);tilt.add(ha);own.push(hm);
 let cl=null;if(!g.gas){const ct=cloudTex(g),cm=new THREE.MeshStandardMaterial({map:ct,transparent:true,depthWrite:false,roughness:1,metalness:0,envMapIntensity:.2});cl=new THREE.Mesh(GEO.sphHi,cm);cl.scale.setScalar(1.02);tilt.add(cl);own.push(ct,cm);}
 if(g.ring){const rt=ringTex(g),rm=new THREE.MeshBasicMaterial({map:rt,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false});tilt.add(new THREE.Mesh(GEO.pring,rm));own.push(rt,rm);}
 tilt.rotation.z=g.tilt;tilt.rotation.x=g.tilt*.4;body.add(tilt);body.scale.set(g.r,g.r,g.r);body.position.y=0;root.add(body);
 const wm=new THREE.Mesh(GEO.plane,wellMat);wm.scale.setScalar(g.r*2.6);wm.position.y=-8;wm.visible=false;root.add(wm);
 root.position.set(g.x,0,g.y);
 return{o:root,sp,cl,own};
}
function updPlanet(o,g){o.o.position.y=(g.z||0)*ALT;o.sp.rotation.y+=.0006;if(o.cl)o.cl.rotation.y+=.0011;if(o.bh)o.bh.rotation.z+=.012;}
function rockObj(r){
 if(r.moon){const m=new THREE.Mesh(GEO.sphHi,moonMat(r.seed%3));m.scale.set(r.r,r.r,r.r);m.position.set(r.x,-12,r.y);m.rotation.y=r.rot;m.castShadow=true;m.receiveShadow=true;return{o:m};}
 const v=r.seed%6,mat=r.seed%5===0?MT.rockOre:MT.rock,g=new THREE.Group(),rs=mulberry32(r.seed);
 const m=new THREE.Mesh(GEO.ast[v],mat);m.scale.setScalar(r.r*1.08);m.castShadow=true;m.receiveShadow=true;g.add(m);
 for(let i=0;i<2;i++){const a=rs()*PI*2,e=(rs()-.5)*.8,d=r.r*(1.3+rs()*.35),b=new THREE.Mesh(GEO.ast[(v+1+i)%6],mat);b.scale.setScalar(r.r*(.06+rs()*.06));b.position.set(Math.cos(a)*d,e*r.r*.9,Math.sin(a)*d);b.rotation.set(rs()*6,rs()*6,0);b.castShadow=true;g.add(b);}
 g.position.set(r.x,-4,r.y);g.rotation.set(r.seed%7,r.rot,r.seed%5);
 return{o:g};
}
function updRock(o,r){o.o.position.y=(r.z||0)*ALT+(r.moon?-12:-4);if(r.moon)o.o.rotation.y=r.rot;else{o.o.rotation.y=r.rot;o.o.rotation.x=r.seed%7+r.rot*.6;}}
const pickMats={};
function pickMat(hex){let m=pickMats[hex];if(!m)m=pickMats[hex]=new THREE.MeshStandardMaterial({color:new THREE.Color(hex).multiplyScalar(.4),emissive:new THREE.Color(hex),emissiveIntensity:1.8,metalness:.6,roughness:.3});return m;}
function flotObj(f){const m=new THREE.Mesh(f.type==='gold'?GEO.oct:GEO.box,pickMat(FLOC[f.type]));m.scale.setScalar(f.type==='gold'?6:8);m.castShadow=true;return{o:m};}
function updFlot(o,f){o.o.position.set(f.x,6,f.y);o.o.rotation.set(f.rot,f.rot*1.3,0);}
function powObj(u){const g=new THREE.Group(),mt=pickMat(PWRC[u.type]),c=new THREE.Mesh(GEO.oct,mt);c.scale.setScalar(10);c.castShadow=true;g.add(c);const r=new THREE.Mesh(GEO.ringThin,mt);r.scale.setScalar(13);g.add(r);return{o:g,c,r};}
function updPow(o,u){o.o.position.set(u.x,20+Math.sin(u.bob)*6,u.y);o.c.rotation.y=u.bob;o.r.rotation.x=u.bob*.7;o.r.rotation.z=u.bob*.4;}

/* ---------- beacon ---------- */
const beacon=new THREE.Group();
{const bm=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,2.2,.8),transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false});
 const tr=new THREE.Mesh(new THREE.TorusGeometry(60,2,8,64).rotateX(PI/2),bm);beacon.add(tr);
 const pm=new THREE.MeshBasicMaterial({color:new THREE.Color(.3,1.3,.5),transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const pl=new THREE.Mesh(new THREE.CylinderGeometry(9,9,520,16,1,true),pm);pl.position.y=260;beacon.add(pl);beacon.visible=false;scene.add(beacon);}

/* ---------- mines and recon relay nodes (3D parity) ---------- */
const minePool=[];
{const coreGeo=new THREE.OctahedronGeometry(7,0),ringGeo=new THREE.TorusGeometry(13,1.2,6,24).rotateX(PI/2);
 for(let i=0;i<40;i++){const g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0x6a7078,transparent:true,opacity:.85});const core=new THREE.Mesh(coreGeo,mat);const ring=new THREE.Mesh(ringGeo,mat);ring.rotation.x=.5;g.add(core,ring);g.visible=false;scene.add(g);minePool.push({g,mat,core,ring});}}
const scanPool=[];
{for(let i=0;i<3;i++){const g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0x7de3ff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});const ring=new THREE.Mesh(new THREE.TorusGeometry(26,1.6,8,48).rotateX(PI/2),mat);ring.position.y=8;const col=new THREE.Mesh(new THREE.CylinderGeometry(3,10,240,12,1,true),mat);col.position.y=120;const core=new THREE.Mesh(new THREE.OctahedronGeometry(8,0),mat);core.position.y=8;g.add(ring,col,core);g.visible=false;scene.add(g);scanPool.push({g,mat,ring,core});}}

/* ---------- instanced effects ---------- */
function inst(geo,mat,n){const m=new THREE.InstancedMesh(geo,mat,n);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.setColorAt(0,C.setRGB(1,1,1));m.count=0;scene.add(m);return m;}
const addMat=()=>new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
const MAXS=700,MAXB=90,MAXR=60,MAXD=160,MAXP=2200;
const shotM=inst(GEO.shot,addMat(),MAXS),beamM=inst(GEO.beam,addMat(),MAXB),ringM=inst(GEO.shock,addMat(),MAXR),debM=inst(GEO.tetra,MT.debris,MAXD);debM.castShadow=true;
const pPos=new Float32Array(MAXP*3),pCol=new Float32Array(MAXP*3),pSize=new Float32Array(MAXP),pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3).setUsage(THREE.DynamicDrawUsage));pGeo.setAttribute('pcol',new THREE.BufferAttribute(pCol,3).setUsage(THREE.DynamicDrawUsage));pGeo.setAttribute('psize',new THREE.BufferAttribute(pSize,1).setUsage(THREE.DynamicDrawUsage));
const pMat=new THREE.ShaderMaterial({uniforms:{sc:{value:1000}},
 vertexShader:'attribute vec3 pcol;attribute float psize;uniform float sc;varying vec3 vC;void main(){vC=pcol;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=max(1.0,psize*sc/-mv.z);gl_Position=projectionMatrix*mv;}',
 fragmentShader:'varying vec3 vC;void main(){vec2 d=gl_PointCoord-0.5;float a=smoothstep(0.5,0.05,length(d));gl_FragColor=vec4(vC*a,1.0);}',
 transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
const points=new THREE.Points(pGeo,pMat);points.frustumCulled=false;scene.add(points);
const flashes=[];for(let i=0;i<3;i++){const l=new THREE.PointLight(0xffc890,0,1400,2);scene.add(l);flashes.push(l);}
const engL=new THREE.PointLight(0xffffff,0,700,2);scene.add(engL);
const DN=700,dBase=new Float32Array(DN*3),dPos=new Float32Array(DN*3),dCol=new Float32Array(DN*3),dSz=new Float32Array(DN),dGeo=new THREE.BufferGeometry();
{const r=mulberry32(5);for(let i=0;i<DN;i++){dBase[i*3]=r()*3600;dBase[i*3+1]=-150+r()*300;dBase[i*3+2]=r()*3600;const b=.1+r()*.28;dCol[i*3]=b*.8;dCol[i*3+1]=b*.95;dCol[i*3+2]=b*1.2;dSz[i]=2+r()*5;}}
dGeo.setAttribute('position',new THREE.BufferAttribute(dPos,3).setUsage(THREE.DynamicDrawUsage));dGeo.setAttribute('pcol',new THREE.BufferAttribute(dCol,3));dGeo.setAttribute('psize',new THREE.BufferAttribute(dSz,1));
const dust=new THREE.Points(dGeo,pMat);dust.frustumCulled=false;scene.add(dust);
function updDust(tx,tz){for(let i=0;i<DN;i++){const j=i*3;dPos[j]=tx+((((dBase[j]-tx)%3600)+3600)%3600)-1800;dPos[j+1]=dBase[j+1];dPos[j+2]=tz+((((dBase[j+2]-tz)%3600)+3600)%3600)-1800;}dGeo.attributes.position.needsUpdate=true;}
/* surrounding space: layered starfield + seamless nebula shells so the world wraps the player in cockpit */
function starLayer(n,R,size,opacity,seed){
 const g=new THREE.BufferGeometry(),sp=new Float32Array(n*3),sc=new Float32Array(n*3),r=mulberry32(seed);
 for(let i=0;i<n;i++){const th=r()*PI*2,ph=Math.acos(2*r()-1),rad=R*(.92+r()*.16);
  sp[i*3]=rad*Math.sin(ph)*Math.cos(th);sp[i*3+1]=rad*Math.cos(ph);sp[i*3+2]=rad*Math.sin(ph)*Math.sin(th);
  const b=.22+r()*.78,t=r();sc[i*3]=b*(t<.22?.72:1);sc[i*3+1]=b*(t<.22?.8:.97);sc[i*3+2]=b*(t>.82?.78:1);}
 g.setAttribute('position',new THREE.BufferAttribute(sp,3));g.setAttribute('color',new THREE.BufferAttribute(sc,3));
 const p=new THREE.Points(g,new THREE.PointsMaterial({size:size,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:opacity,depthWrite:false}));
 p.frustumCulled=false;scene.add(p);return p;
}
const stars=[starLayer(1400,12500,1.4,.5,7),starLayer(2600,9000,2.1,.95,99),starLayer(700,5200,2.9,.8,13)];
/* seamless nebula shells: wrapped blobs + fibrous detail + dither, so no UV seam or banding */
function nebTex(seed,w,h,cols,alpha,band){
 const c=mkCanvas(w,h),x=c.getContext('2d'),r=mulberry32(seed);
 const blob=function(cx,cy,rad,cl,a){
  for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){
   const X=cx+ox*w,Y=cy+oy*h,g=x.createRadialGradient(X,Y,0,X,Y,rad);
   g.addColorStop(0,'rgba('+cl[0]+','+cl[1]+','+cl[2]+','+a.toFixed(3)+')');
   g.addColorStop(.5,'rgba('+cl[0]+','+cl[1]+','+cl[2]+','+(a*.5).toFixed(3)+')');
   g.addColorStop(1,'rgba('+cl[0]+','+cl[1]+','+cl[2]+',0)');
   x.fillStyle=g;x.fillRect(X-rad,Y-rad,rad*2,rad*2);
  }
 };
 if(band)for(let i=0;i<12;i++){const t=i/12,cx=t*w,cy=h*.5+Math.sin(t*12.566)*h*.16;blob(cx,cy,h*(.2+r()*.16),cols[r()*cols.length|0],alpha*.45);}
 for(let i=0;i<14;i++)blob(r()*w,r()*h,w*(.06+r()*.2),cols[r()*cols.length|0],alpha*(.4+r()*.5));
 for(let i=0;i<1100;i++)blob(r()*w,r()*h,w*(.008+r()*.026),cols[r()*cols.length|0],alpha*(.15+r()*.28));
 const id=x.getImageData(0,0,w,h),d=id.data;
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const n=(r()*2-1)*8;d[i]=clamp(d[i]+n,0,255);d[i+1]=clamp(d[i+1]+n,0,255);d[i+2]=clamp(d[i+2]+n,0,255);}
 x.putImageData(id,0,0);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=THREE.RepeatWrapping;tex.anisotropy=4;
 return tex;
}
 function nebShell(seed,radius,opacity,order){
 const tex=nebTex(seed,2048,1024,[[120,50,190],[30,120,170],[180,50,120],[40,90,210],[90,60,200]],.1,true);
 const m=new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,transparent:true,opacity:opacity,depthWrite:false,depthTest:false});
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,64,32),m);mesh.renderOrder=order;mesh.frustumCulled=false;scene.add(mesh);return mesh;
}
const nebula=nebShell(4242,8200,.42,-2);
const nebula2=nebShell(1717,11000,.26,-3);
const FD=64,fld=new THREE.InstancedMesh(GEO.ast[0],MT.rock,FD);fld.frustumCulled=false;
{const r=mulberry32(777);for(let i=0;i<FD;i++){dummy.position.set((r()*2-1)*3200,r()*340-40,(r()*2-1)*3200);dummy.rotation.set(r()*PI*2,r()*PI*2,r()*PI*2);const s=6+r()*22;dummy.scale.set(s,s*(.6+r()*.6),s);dummy.updateMatrix();fld.setMatrixAt(i,dummy.matrix);}fld.instanceMatrix.needsUpdate=true;}
fld.visible=false;scene.add(fld);
const SHOT={ion:[10,4.5,4.5,2.4],plasma:[12,8.5,8.5,2.2],vulcan:[11,1.6,1.6,2.6],flak:[4.5,2.6,2.6,2.2],turret:[11,2.3,2.3,2.4]};
function effects(){
 let n=0;
 for(const p of projectiles){if(n>=MAXS)break;const k=SHOT[p.type]||SHOT.turret,c=crgb(p.col);dummy.position.set(p.x,p.z*ALT,p.y);dummy.rotation.set(0,-Math.atan2(p.vy,p.vx),0);dummy.scale.set(k[0],k[1],k[2]);dummy.updateMatrix();shotM.setMatrixAt(n,dummy.matrix);shotM.setColorAt(n,C.setRGB(c[0]*k[3]+.25,c[1]*k[3]+.25,c[2]*k[3]+.25));n++;}
 shotM.count=n;shotM.instanceMatrix.needsUpdate=true;if(shotM.instanceColor)shotM.instanceColor.needsUpdate=true;
 n=0;
 for(const b of beams){if(n>=MAXB)break;const f=b.life/b.max;V.set(b.x1,b.z1*ALT,b.y1);V2.set(b.x2,b.z2*ALT,b.y2);const len=V.distanceTo(V2);if(len<.01)continue;
  dummy.position.copy(V).add(V2).multiplyScalar(.5);V2.sub(V).normalize();dummy.quaternion.setFromUnitVectors(XA,V2);const w=b.w*(.5+f*.9);dummy.scale.set(len,w,w);dummy.updateMatrix();beamM.setMatrixAt(n,dummy.matrix);const k=f*3;beamM.setColorAt(n,C.setRGB(b.r*k+f*.6,b.g*k+f*.6,b.b*k+f*.6));n++;}
 dummy.quaternion.identity();dummy.rotation.set(0,0,0);
 beamM.count=n;beamM.instanceMatrix.needsUpdate=true;if(beamM.instanceColor)beamM.instanceColor.needsUpdate=true;
 let nr=0,nd=0,np=0,nf=0;
 for(const l of flashes)l.intensity=0;
 for(const p of particles){
  const f=p.life/p.max,y=p.z*ALT;
  if(p.type===1){if(nr<MAXR){const R=p.size*(1-f)+1;dummy.position.set(p.x,y+2,p.y);dummy.rotation.set(0,0,0);dummy.scale.set(R,1,R);dummy.updateMatrix();ringM.setMatrixAt(nr,dummy.matrix);ringM.setColorAt(nr,C.setRGB(p.r*f*1.8,p.g*f*1.8,p.b*f*1.8));nr++;}}
  else if(p.type===3){if(nd<MAXD){dummy.position.set(p.x,y,p.y);dummy.rotation.set(p.rot,p.rot*.7,p.rot*1.3);const s=p.size*Math.min(1,f*3);dummy.scale.set(s,s,s);dummy.updateMatrix();debM.setMatrixAt(nd,dummy.matrix);nd++;}}
  else{
   if(p.type===4&&nf<flashes.length){const l=flashes[nf++];l.position.set(p.x,y+40,p.y);l.color.setRGB(p.r,p.g,p.b);l.intensity=f*p.size*900;}
   if(np<MAXP){const i=np*3,k=p.type===2?f*.22:p.type===4?f*.5:f*1.7;pPos[i]=p.x;pPos[i+1]=y;pPos[i+2]=p.y;pCol[i]=p.r*k;pCol[i+1]=p.g*k;pCol[i+2]=p.b*k;pSize[np]=p.type===2?p.size*(2.6-f):p.type===4?p.size*1.3:p.size*(1+f)*1.25;np++;}
  }
 }
 dummy.rotation.set(0,0,0);
 ringM.count=nr;ringM.instanceMatrix.needsUpdate=true;if(ringM.instanceColor)ringM.instanceColor.needsUpdate=true;
 debM.count=nd;debM.instanceMatrix.needsUpdate=true;
 pGeo.setDrawRange(0,np);pGeo.attributes.position.needsUpdate=true;pGeo.attributes.pcol.needsUpdate=true;pGeo.attributes.psize.needsUpdate=true;
}

/* ---------- state sync: create on first sight, update, sweep + dispose ---------- */
const maps={ship:new Map(),st:new Map(),pl:new Map(),rk:new Map(),fl:new Map(),pu:new Map(),wr:new Map()};
let frameNo=0;
function sync(map,list,make,upd){
 for(const it of list){if(it.dead)continue;let o=map.get(it);if(!o){o=make(it);map.set(it,o);scene.add(o.o);}o.seen=frameNo;if(upd)upd(o,it);}
 for(const e of map){const o=e[1];if(o.seen!==frameNo){scene.remove(o.o);if(o.own)for(const d of o.own)d.dispose();map.delete(e[0]);}}
}

/* ---------- post-processing ---------- */
const TiltShader={
 uniforms:{tDiffuse:{value:null},dir:{value:new THREE.Vector2(1,0)},res:{value:new THREE.Vector2(1920,1080)},maxR:{value:12},fin:{value:0},tm:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:[
 'uniform sampler2D tDiffuse;uniform vec2 dir;uniform vec2 res;uniform float maxR;uniform float fin;uniform float tm;varying vec2 vUv;',
 'float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
 'void main(){',
 ' float d=abs(vUv.y-0.5);',
 ' float r=maxR*smoothstep(0.13,0.5,d);',
 ' float sp=r/6.0;',
 ' float j=rnd(vUv*res+dir*17.0)-0.5;',
 ' vec4 acc=vec4(0.0);float ws=0.0;',
 ' for(int i=-6;i<=6;i++){float fi=float(i);float w=1.0-abs(fi)/7.0;acc+=texture2D(tDiffuse,vUv+dir*(fi+j)*sp/res)*w;ws+=w;}',
 ' vec4 c=acc/ws;',
 ' if(fin>0.5){float l=dot(c.rgb,vec3(0.2126,0.7152,0.0722));c.rgb=max(vec3(0.0),mix(vec3(l),c.rgb,1.32));c.rgb=max(vec3(0.0),(c.rgb-0.18)*1.07+0.18);vec2 q=vUv-0.5;c.rgb*=1.0-dot(q,q)*0.6;float ca=dot(q,q)*0.006;c.r=mix(c.r,texture2D(tDiffuse,vUv+q*ca).r,0.6);c.b=mix(c.b,texture2D(tDiffuse,vUv-q*ca).b,0.6);c.rgb=max(vec3(0.0),c.rgb+(rnd(vUv*res+tm)-0.5)*0.02);}',
 ' gl_FragColor=c;',
 '}'].join('\n')
};
let composer=null,tiltH=null,tiltV=null,curQ='',curPR=0,curW=0,curH=0,curMission=-1;
function sizeUniforms(){
 const sz=renderer.getDrawingBufferSize(new THREE.Vector2());
 for(const t of[tiltH,tiltV]){t.uniforms.res.value.set(sz.x,sz.y);t.uniforms.maxR.value=12*sz.y/1080;}
 pMat.uniforms.sc.value=sz.y/(2*Math.tan(HALF_FOV));
 const e=Math.max(W,H)*.8+320,sc=sun.shadow.camera;sc.left=-e;sc.right=e;sc.top=e;sc.bottom=-e;sc.updateProjectionMatrix();
}
function build(q){
 if(composer){for(const p of composer.passes)if(p.dispose)p.dispose();composer.dispose();}
 renderer.setPixelRatio(curPR);renderer.setSize(cw,ch,false);
 const rt=new THREE.WebGLRenderTarget(cw,ch,{type:THREE.HalfFloatType,samples:q==='high'?4:0});
 composer=new EffectComposer(renderer,rt);
 composer.addPass(new RenderPass(scene,cam));
 if(q==='high'){const sz=renderer.getDrawingBufferSize(new THREE.Vector2());composer.addPass(new UnrealBloomPass(sz,.6,.5,1.0));}
 tiltH=new ShaderPass(TiltShader);tiltV=new ShaderPass(TiltShader);tiltH.uniforms.dir.value.set(1,0);tiltV.uniforms.dir.value.set(0,1);tiltV.uniforms.fin.value=1;
 composer.addPass(tiltH);composer.addPass(tiltV);composer.addPass(new OutputPass());
 composer.setSize(cw,ch);
 sun.castShadow=q==='high';debM.castShadow=q==='high';
 sizeUniforms();
}
function checkQuality(){
 const q=settings.gfx==='low'?'low':'high',pr=Math.max(.3,pixRatio());
 if(q!==curQ||!composer){curQ=q;curPR=pr;curW=cw;curH=ch;build(q);return;}
 if(Math.abs(pr-curPR)>.001||cw!==curW||ch!==curH){curPR=pr;curW=cw;curH=ch;renderer.setPixelRatio(pr);renderer.setSize(cw,ch,false);composer.setPixelRatio(pr);composer.setSize(cw,ch);sizeUniforms();}
}
let ckPZ=null,ckPitch=0,tailYaw=null,tailPrev=false;
function placeCam(){
 if(window.CINE_CAM){const q=window.CINE_CAM;cam.fov=52;cam.near=2;cam.aspect=W/H;cam.position.set(q.x,q.y,q.z);cam.up.set(0,1,0);cam.lookAt(q.lx,q.ly,q.lz);cam.updateProjectionMatrix();cam.updateMatrixWorld(true);sun.position.set(q.x-380,1250,q.z+440);sun.target.position.set(q.lx,0,q.lz);sun.target.updateMatrixWorld();updDust(q.x,q.z);return;}
 const tl=!!window.tailOn&&player&&!player.dead;
 if(tl){
  const p=player;
  if(!tailPrev||window.__tailSnap){tailYaw=p.ang;window.__tailSnap=false;}
  tailPrev=true;
  if(window.tailFixed)tailYaw=p.ang;
  else{let dd=p.ang-tailYaw;dd=((dd+PI)%(PI*2)+PI*2)%(PI*2)-PI;tailYaw+=dd*.14;}
  const ca=Math.cos(tailYaw),sa=Math.sin(tailYaw);
  const back=150+Math.min(90,(p.thr||0)*70)+(p.boost>0?20:0);
  const px=p.x-ca*back,py=p.z*ALT+62,pz=p.y-sa*back;
  cam.fov=60;cam.near=3;cam.far=30000;cam.aspect=W/H;
  cam.position.set(px,py,pz);cam.up.set(0,1,0);
  cam.lookAt(p.x+ca*120,p.z*ALT+8,p.y+sa*120);
  cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
  sun.position.set(px-380,1250,pz+440);sun.target.position.set(p.x,0,p.y);sun.target.updateMatrixWorld();
  updDust(px,pz);floor.position.x=Math.round(px/3250)*3250;floor.position.z=Math.round(pz/3250)*3250;
  return;
 }
 tailPrev=false;
 const ck=!!window.cockpitOn&&player&&!player.dead;
 if(ck){
  const p=player,pit=p.pitch||0,cp=Math.cos(pit),sp=Math.sin(pit),ca=Math.cos(p.ang),sa=Math.sin(p.ang);
  const roll=p.bank*.95+(p.roll>0?(1-p.roll/20)*PI*2*p.rollDir:0),cr=Math.cos(roll),sr=Math.sin(roll);
  const shx=(Math.random()-.5)*shake*settings.shake,shz=(Math.random()-.5)*shake*settings.shake;
  const px=p.x+cp*ca*p.r*.3-sp*ca*p.r*.4+shx,py=p.z*ALT+sp*p.r*.3+cp*p.r*.4,pz=p.y+cp*sa*p.r*.3-sp*sa*p.r*.4+shz;
  cam.fov=70;cam.near=2;cam.far=30000;cam.aspect=W/H;
  cam.position.set(px,py,pz);
  cam.up.set(-sp*ca*cr-sa*sr,cp*cr,-sp*sa*cr+ca*sr);
  cam.lookAt(px+cp*ca*200,py+sp*200,pz+cp*sa*200);
  cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
  sun.position.set(px-380,1250,pz+440);sun.target.position.set(px,0,pz);sun.target.updateMatrixWorld();
  updDust(px,pz);floor.position.x=Math.round(px/3250)*3250;floor.position.z=Math.round(pz/3250)*3250;
  return;
 }
 ckPZ=null;ckPitch=0;cam.fov=32;cam.near=40;
 const d=H/(2*Math.tan(HALF_FOV)),tx=camX+W/2,tz=camY+H/2;
 cam.aspect=W/H;cam.position.set(tx,d*Math.sin(PITCH),tz+d*Math.cos(PITCH));cam.lookAt(tx,0,tz);cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
 sun.position.set(tx-380,1250,tz+440);sun.target.position.set(tx,0,tz);sun.target.updateMatrixWorld();
 updDust(tx,tz);floor.position.x=Math.round(tx/3250)*3250;floor.position.z=Math.round(tz/3250)*3250;
}
const out={x:0,y:0},out2={x:0,y:0};
function w2sB(x,y,z){
 V.set(x,(z||0)*ALT,y).applyMatrix4(cam.matrixWorldInverse);
 if(V.z>-1){out.x=W/2+(x-camX-W/2)*3;out.y=H/2+(y-camY-H/2)*3;return out;}
 V.applyMatrix4(cam.projectionMatrix);out.x=(V.x*.5+.5)*W;out.y=(-V.y*.5+.5)*H;return out;
}
function s2wB(sx,sy){
 V.set(sx/W*2-1,-(sy/H*2-1),.5).unproject(cam).sub(cam.position).normalize();
 const t=V.y<-1e-4?-cam.position.y/V.y:0;out2.x=cam.position.x+V.x*t;out2.y=cam.position.z+V.z*t;return out2;
}
function render(){
 if(!M)return false;
 frameNo++;checkQuality();
 if(M.id!==curMission){curMission=M.id;setSector(M.sea);}
 placeCam();
 nebula.position.copy(cam.position);nebula2.position.copy(cam.position);
 for(let si=0;si<stars.length;si++)stars[si].position.copy(cam.position);
 nebula.rotation.y+=.00003;nebula2.rotation.y-=.000022;
 for(let si=0;si<stars.length;si++)stars[si].rotation.y+=.000008*(si+1);
 fld.visible=!!(window.cockpitOn||window.tailOn);fld.rotation.y+=.0002;floor.visible=false;
 const ck=!!((window.cockpitOn||window.tailOn)&&player&&!player.dead);const szr=renderer.getDrawingBufferSize(new THREE.Vector2());const mr=ck?0:12*szr.y/1080;tiltH.uniforms.maxR.value=mr;tiltV.uniforms.maxR.value=mr;pMat.uniforms.sc.value=szr.y/(2*Math.tan((ck?70:32)*Math.PI/360));
 sync(maps.ship,ships,shipObj,updShip);sync(maps.st,stations,stationObj,updStation);sync(maps.pl,gravityWells,planetObj,updPlanet);
 sync(maps.rk,rocks,rockObj,updRock);sync(maps.fl,flotsams,flotObj,updFlot);sync(maps.pu,powerups,powObj,updPow);sync(maps.wr,wrecks,wreckObj,updWreck);
 for(let i=0;i<minePool.length;i++){const o=minePool[i],m=typeof mines!=='undefined'?mines[i]:null;if(!m){o.g.visible=false;continue;}const armed=m.arm<=0;o.g.visible=true;o.g.position.set(m.x,7,m.y);o.g.rotation.y=frameNo*.02+i;o.g.scale.setScalar(armed?1+Math.sin(frameNo*.2+i)*.08:1);o.mat.color.setHex(armed?0xff5a5a:0x6a7078);o.mat.opacity=armed?.85:.5;}
 const sn=(M.scanNodes||[]);for(let i=0;i<scanPool.length;i++){const o=scanPool[i],n=sn[i];if(!n){o.g.visible=false;continue;}o.g.visible=true;o.g.position.set(n.x,0,n.y);o.mat.color.setHex(n.done?0x6fe08a:0x7de3ff);o.g.rotation.y=frameNo*.01+i;o.core.rotation.y=frameNo*.03;o.ring.scale.setScalar(1+Math.sin(frameNo*.06+i)*.06);}
 effects();
 wellMat.uniforms.t.value=frameNo*.016;
 hemi.intensity=HEMI+(M.flash||0)*5;
 if(M.beacon){beacon.visible=true;beacon.position.set(M.beacon.x,-4,M.beacon.y);const k=1+Math.sin(frameNo*.07)*.08;beacon.children[0].scale.set(k,1,k);}else beacon.visible=false;
 tiltV.uniforms.tm.value=frameNo%97;
 if(player&&!player.dead){const pc=crgb(player.trail);engL.color.setRGB(pc[0],pc[1],pc[2]);engL.position.set(player.x-Math.cos(player.ang)*player.r*1.5,player.z*ALT+12,player.y-Math.sin(player.ang)*player.r*1.5);engL.intensity=Math.min(1.6,player.thr)*14000;}else engL.intensity=0;
 composer.render();
 overlayAll();
 return true;
}

/* ---------- dockyard preview (own small renderer, drawn into the card's 2D canvas) ---------- */
let pv=null,pvFail=false;const pvObjs=new Map();
function preview(el,idx,cols){
 if(pvFail)return false;
 try{
  if(!pv){
   const c=mkCanvas(624,384),r=new THREE.WebGLRenderer({canvas:c,antialias:true,alpha:true,powerPreference:'low-power'});
   r.setPixelRatio(1);r.setSize(624,384,false);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.15;r.setClearColor(0x000000,0);
   const sc=new THREE.Scene(),pg=new THREE.PMREMGenerator(r);sc.environment=pg.fromScene(new RoomEnvironment(r),.04).texture;pg.dispose();
   sc.add(new THREE.HemisphereLight(0xa8c6ff,0x241a2c,1.6));const dl=new THREE.DirectionalLight(0xffe0bc,4.4);dl.position.set(-3,6,2.5);sc.add(dl);
   const pc=new THREE.PerspectiveCamera(30,416/256,.1,50);pc.position.set(0,2.5,4.9);pc.lookAt(0,-.05,0);
   const holder=new THREE.Group();sc.add(holder);pv={r,sc,pc,holder,c};
  }
  const key=idx+cols.hull+(cols.trim||'')+(cols.prism?'prism':cols.trail)+(settings.glow!==false?'g':'');let o=pvObjs.get(key);
  if(!o){
   if(pvObjs.size>40){for(const x of pvObjs.values())for(const d of x.own)d.dispose();pvObjs.clear();}
   o=shipObj({idx,hull:cols.hull,trail:cols.trail,trim:cols.trim,isPlayer:true,prism:!!cols.prism,team:0,cargo:false,marked:false});pvObjs.set(key,o);
   for(const f of o.fl)f[0].scale.set(.7,f[1],f[1]);
  }
  pv.holder.clear();pv.holder.add(o.o);if(o.pr)prismPaint(o,cols.trail);
  const t=performance.now()*.0006+idx;o.o.rotation.y=t;o.b.rotation.x=Math.sin(t*1.3)*.18;o.o.scale.setScalar(.72+.24*SHIPS[idx].sc);
  pv.r.render(pv.sc,pv.pc);
  const x=el.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,el.width,el.height);x.drawImage(pv.c,0,0,el.width,el.height);
  return true;
 }catch(e){pvFail=true;return false;}
}

window.R3D={design:designShip,on:settings.gfx!=='classic',failed:false,ready:true,render,resize(){curW=-1;},w2s:w2sB,s2w:s2wB,preview,stats(){return{mines:minePool.filter(o=>o.g.visible).length,nodes:scanPool.filter(o=>o.g.visible).length,bubbles:typeof ships!=='undefined'?ships.filter(s=>s.special==='shield'||(s.team===1&&typeof projectorGuard==='function'&&projectorGuard(s))).length:0,cam:{x:cam.position.x,y:cam.position.y,z:cam.position.z},yaw:tailYaw};}};
try{r3dReady();}catch(e){}
}catch(e){if(window.console)console.warn('Parsec: 3D renderer unavailable, using classic 2D.',e);fail();}
})();
