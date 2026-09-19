(function(){
'use strict';
/* =====================================================================
   MBL — Lancelot cruza el bosque y las cascadas hasta el castillo de Odette
   Juego de plataformas dibujado en <canvas> (pixel art procedural + sprites)
   ===================================================================== */

/* ---------- Constantes ---------- */
const W = 480, H = 300, K = 2;          // resolución lógica y factor de nitidez
const GY = 240;                          // altura del suelo
const WORLD = 4500;
const GRAV = 1500, SALTO = 540, VEL = 150, MAXHP = 5;
const HW = 9, HH = 50;                   // medio ancho y alto del jugador
const TOTAL_ROSAS = 12;
const GATE_X = 4320;

/* ---------- Nivel ---------- */
// Tramos de suelo [x1,x2]. Los huecos entre tramos son pozos con agua.
const TRAMOS = [[0,720],[810,1400],[1400,1650],[1740,1960],[2140,2560],[2860,3560],[3650,4500]];
const MESETA = {x:2560, y:GY-64, w:300, h:400, tipo:'suelo'};      // terreno elevado
const POZOS  = [{x1:720,x2:810,cascada:false},{x1:1650,x2:1740,cascada:true},{x1:1960,x2:2140,cascada:true},{x1:3560,x2:3650,cascada:true}];
const ZONAS  = [
  {x:0,    sub:'Capítulo 1', nombre:'BOSQUE DE LUNA'},
  {x:1400, sub:'Capítulo 2', nombre:'LAS CASCADAS'},
  {x:2860, sub:'Capítulo 3', nombre:'PUENTE DEL RÍO'},
  {x:3700, sub:'Capítulo 4', nombre:'CASTILLO DE ODETTE'}
];
const zonaEn = x => x < 1400 ? 0 : x < 2860 ? 1 : x < 3700 ? 2 : 3;

const BLOQUES = [];
function pila(x, n, tipo, base){
  tipo = tipo || 'piedra'; base = base == null ? GY : base;
  const r = [];
  for (let i = 0; i < n; i++){ const b = {x, y: base - 32*(i+1), w:32, h:32, tipo, vivo:true, drop:null, liana:false}; BLOQUES.push(b); r.push(b); }
  return r;
}
function flota(x, y, n){
  for (let i = 0; i < n; i++) BLOQUES.push({x: x + 32*i, y, w:32, h:32, tipo:'piedra', vivo:true, drop:null, liana:true});
}
// Zona 1: bosque
pila(260,1); pila(384,2); pila(846,1); flota(880, GY-96, 3);
pila(1010,2,'grieta')[1].drop = 'corazon';
// Zona 2: cascadas
pila(1470,1); pila(1502,2); pila(1534,1);
pila(1770,1,'runa');
pila(2200,2,'grieta')[1].drop = 'corazon';
pila(2528,1);
// Zona 3: puente
pila(2940,3,'grieta')[2].drop = 'corazon';
pila(3110,1); flota(3142, GY-96, 2);
// Zona 4: castillo
pila(3740,1,'runa'); pila(3772,1,'runa');

const PINCHOS = [ {x:590,w:48},{x:1230,w:32},{x:2400,w:48},{x:3410,w:32},{x:3470,w:32} ];
const CHECKS  = [ {x:40}, {x:1330}, {x:2165}, {x:3690} ];
const ROSAS_DATA = [
  [215,GY-46],[400,GY-92],[614,GY-76],[765,GY-84],[928,GY-122],[1695,GY-86],
  [2050,GY-82],[2700,GY-64-44],[2985,GY-40],[3174,GY-122],[3450,GY-88],[3605,GY-88]
];
const ENEMIGOS_DATA = [
  {t:'minion', x1:440,  x2:560,  y:GY},
  {t:'minion', x1:1060, x2:1200, y:GY},
  {t:'minion', x1:1565, x2:1630, y:GY},
  {t:'elite',  x1:1800, x2:1930, y:GY},
  {t:'minion', x1:2250, x2:2380, y:GY},
  {t:'minion', x1:2462, x2:2516, y:GY},
  {t:'elite',  x1:2640, x2:2800, y:GY-64},
  {t:'minion', x1:3010, x2:3095, y:GY},
  {t:'elite',  x1:3235, x2:3385, y:GY},
  {t:'elite',  x1:3790, x2:3890, y:GY},
  {t:'capitan',x1:3960, x2:4200, y:GY}
];
const TIPOS = {
  minion :{img:'minion',         esc:.82, hw:12, hh:38, hp:1, vel:42, carga:190, vista:120, aviso:.50},
  elite  :{img:'minion_elite',   esc:.92, hw:13, hh:41, hp:2, vel:50, carga:215, vista:135, aviso:.42},
  capitan:{img:'minion_capitan', esc:1.55,hw:24, hh:74, hp:5, vel:62, carga:250, vista:200, aviso:.55}
};

/* ---------- Utilidades ---------- */
const $ = id => document.getElementById(id);
const canvas = $('mbl-canvas'), ctx = canvas.getContext('2d');
canvas.width = W*K; canvas.height = H*K;
const pantallaMbl = $('pantalla-mbl'), pantallaVict = $('pantalla-mbl-victoria');
const vidasEl = $('vidas-mbl'), metaEl = $('meta-mbl'), avisoEl = $('mbl-aviso');
const bannerEl = $('mbl-banner'), jefeEl = $('mbl-jefe'), dlgEl = $('mbl-dialogo');

const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const hash = n => { const s = Math.sin(n*127.1 + 311.7)*43758.5453; return s - Math.floor(s); };
function hex(c){ return [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)]; }
function mix(a,b,t){ const A=hex(a), B=hex(b); t=clamp(t,0,1); return 'rgb('+Math.round(A[0]+(B[0]-A[0])*t)+','+Math.round(A[1]+(B[1]-A[1])*t)+','+Math.round(A[2]+(B[2]-A[2])*t)+')'; }
function R(x,y,w,h,c){ ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
const ease = t => 1 - Math.pow(1-clamp(t,0,1), 3);

/* ---------- Sonido (sintetizado, sin archivos) ---------- */
let AC = null;
function audio(){ try{ if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==='suspended') AC.resume(); }catch(e){} }
function tono(f1,f2,dur,tipo,vol){
  if(!AC) return;
  try{
    const o=AC.createOscillator(), g=AC.createGain(), t0=AC.currentTime;
    o.type=tipo||'square'; o.frequency.setValueAtTime(f1,t0); o.frequency.exponentialRampToValueAtTime(Math.max(f2,30),t0+dur);
    g.gain.setValueAtTime(vol||.05,t0); g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0+dur);
  }catch(e){}
}
const sfx = {
  salto:()=>tono(280,620,.14,'square',.035),
  ataque:()=>tono(520,160,.12,'sawtooth',.03),
  golpe:()=>tono(220,60,.16,'square',.05),
  rosa:()=>{ tono(700,1100,.1,'triangle',.05); setTimeout(()=>tono(1100,1600,.12,'triangle',.04),80); },
  dano:()=>tono(260,70,.3,'sawtooth',.06),
  agua:()=>tono(420,90,.4,'sine',.07),
  check:()=>{ tono(500,700,.12,'triangle',.05); setTimeout(()=>tono(700,1000,.16,'triangle',.05),110); },
  romper:()=>tono(160,50,.2,'square',.05),
  puerta:()=>tono(90,140,1.2,'sawtooth',.04),
  corazon:()=>{ tono(600,900,.1,'triangle',.05); setTimeout(()=>tono(900,1300,.14,'triangle',.05),90); }
};

/* ---------- Imágenes ---------- */
const IMG = {};
const ARCHIVOS = {
  idle:'images/mbl/lancelot_idle.png', crouch:'images/mbl/lancelot_crouch.png', run:'images/mbl/lancelot_run.png',
  lunge:'images/mbl/lancelot_lunge.png', raise:'images/mbl/lancelot_raise.png', kneel:'images/mbl/lancelot_kneel.png',
  jump:'images/mbl/lancelot_jump.png', rose:'images/mbl/lancelot_rose.png', back:'images/mbl/lancelot_back.png',
  minion:'images/mbl/minion.png', minion_elite:'images/mbl/minion_elite.png', minion_capitan:'images/mbl/minion_capitan.png',
  odette:'images/sprite-odette.png'
};
const ANC = {idle:49, crouch:46, run:60, lunge:59, raise:58, kneel:58, jump:57, rose:48, back:45}; // x del cuerpo dentro de cada pose
let cargadas = 0, totalImgs = Object.keys(ARCHIVOS).length, listoImgs = false;
Object.keys(ARCHIVOS).forEach(k=>{ const im = new Image(); im.onload = im.onerror = ()=>{ if(++cargadas === totalImgs) listoImgs = true; }; im.src = ARCHIVOS[k]; IMG[k] = im; });

/* ---------- Estado ---------- */
let p, cam, corriendo, t, estado, enemigos, rosas, items, bloques, part, movil, hp, nRosas, cpIdx, zonaActual;
let inv, shake, hitstop, puertaAbierta, puertaT, esc, teclas, bufSalto, bucleId, luciernagas, estrellas, viñeta;
teclas = {izq:false, der:false};

function crearEscenario(){
  estrellas = []; for(let i=0;i<70;i++) estrellas.push({x:hash(i)*W, y:hash(i+99)*150, s:hash(i+7)>.85?2:1, ph:hash(i+3)*6.28});
  luciernagas = []; for(let i=0;i<26;i++) luciernagas.push({x:hash(i+400)*W, y:70+hash(i+500)*160, ph:hash(i+600)*6.28, v:.6+hash(i+700)});
  // viñeta pre-renderizada
  const v = document.createElement('canvas'); v.width = W*K; v.height = H*K;
  const c = v.getContext('2d');
  const g = c.createRadialGradient(W*K/2,H*K/2,H*K*.42, W*K/2,H*K/2,H*K*.95);
  g.addColorStop(0,'rgba(8,4,24,0)'); g.addColorStop(1,'rgba(8,4,24,.55)');
  c.fillStyle = g; c.fillRect(0,0,W*K,H*K);
  viñeta = v;
}

/* ---------- Inicio / reinicio ---------- */
function iniciarMBL(){
  audio();
  bucleId = (bucleId||0) + 1;
  crearEscenario();
  bloques = BLOQUES;
  bloques.forEach(b=>b.vivo = true);
  enemigos = ENEMIGOS_DATA.map(d=>{
    const tp = TIPOS[d.t];
    return {t:d.t, tp, x:(d.x1+d.x2)/2, y:d.y, x1:d.x1, x2:d.x2, dir:1, hp:tp.hp, hpMax:tp.hp, estado:'patrulla', tm:0, cd:.6, kb:0, flash:0, vivo:true, muerte:0, ph:Math.random()*6, activo:d.t!=='capitan'};
  });
  rosas = ROSAS_DATA.map(r=>({x:r[0], y:r[1], vivo:true, ph:Math.random()*6}));
  items = [];
  part = [];
  movil = {x:2050, y:GY-4, w:64, h:10, tipo:'movil', dx:0, cx:2050};
  p = {x:CHECKS[0].x, y:GY, vx:0, vy:0, dir:1, on:null, coyote:0, atk:0, golpeado:false, kb:0, safeX:CHECKS[0].x, safeY:GY, run:0};
  cam = 0; t = 0; hp = MAXHP; nRosas = 0; cpIdx = 0; inv = 0; shake = 0; hitstop = 0; bufSalto = 0;
  puertaAbierta = false; puertaT = 0; esc = null; zonaActual = -1;
  estado = 'juego'; corriendo = true;
  teclas.izq = teclas.der = false;
  dlgEl.classList.remove('activo'); jefeEl.classList.remove('activo'); bannerEl.classList.remove('mostrar');
  actualizarHUD();
  pantallaMbl.classList.add('activa');
  requestAnimationFrame(()=>pantallaMbl.classList.add('visible'));
  const id = bucleId; let ultimo = 0;
  function frame(ts){
    if(!corriendo || id !== bucleId) return;
    if(!ultimo) ultimo = ts;
    let dt = Math.min((ts-ultimo)/1000, .033); ultimo = ts;
    if(listoImgs){ if(hitstop>0){ hitstop -= dt; dt = 0; } actualizar(dt); dibujar(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setTimeout(()=>{ if(corriendo && estado==='juego') avisar('◀ ▶ mover   ⤴ saltar   ⚔ atacar'); }, 900);
}

function actualizarHUD(){
  vidasEl.textContent = '❤️'.repeat(Math.max(hp,0)) + '🖤'.repeat(MAXHP-Math.max(hp,0));
  metaEl.textContent = '🌹 ' + nRosas + ' / ' + TOTAL_ROSAS;
}
function avisar(txt, ms){
  avisoEl.textContent = txt; avisoEl.classList.add('visible');
  clearTimeout(avisar.t); avisar.t = setTimeout(()=>avisoEl.classList.remove('visible'), ms||1800);
}
function mostrarZona(z){
  bannerEl.querySelector('small').textContent = ZONAS[z].sub;
  bannerEl.querySelector('strong').textContent = ZONAS[z].nombre;
  bannerEl.classList.remove('mostrar'); void bannerEl.offsetWidth; bannerEl.classList.add('mostrar');
}

/* ---------- Partículas ---------- */
function pt(x,y,vx,vy,vida,color,size,grav,tipo){ if(part.length>400) return; part.push({x,y,vx,vy,vida,max:vida,color,size:size||2,grav:grav||0,tipo:tipo||'sq'}); }
function chispas(x,y,color,n,fuerza){ for(let i=0;i<n;i++){ const a=Math.random()*6.28, f=(fuerza||90)*(.4+Math.random()); pt(x,y,Math.cos(a)*f,Math.sin(a)*f-40,.35+Math.random()*.35,color,2,320); } }
function salpicar(x,y){ for(let i=0;i<16;i++) pt(x+(Math.random()-.5)*10,y,(Math.random()-.5)*110,-80-Math.random()*140,.6,Math.random()>.5?'#bfe6ff':'#5fa8ff',2,420); }
function corazonesSubir(x,y,n){ for(let i=0;i<n;i++) pt(x+(Math.random()-.5)*30,y+(Math.random()-.5)*10,(Math.random()-.5)*20,-30-Math.random()*30,1.6+Math.random()*.8,'#ff7fa8',1,-10,'corazon'); }

/* ---------- Colisiones ---------- */
function solidosCerca(x){
  const s = [];
  for(const g of TRAMOS){ if(g[1] < x-160 || g[0] > x+160) continue; s.push({x:g[0], y:GY, w:g[1]-g[0], h:400, tipo:'suelo'}); }
  if(MESETA.x+MESETA.w > x-160 && MESETA.x < x+160) s.push(MESETA);
  for(const b of bloques){ if(b.vivo && b.x+b.w > x-160 && b.x < x+160) s.push(b); }
  if(movil.x-movil.w/2 < x+160 && movil.x+movil.w/2 > x-160) s.push({x:movil.x-movil.w/2, y:movil.y, w:movil.w, h:movil.h, tipo:'movil', dx:movil.dx, ref:movil});
  if(!puertaAbierta) s.push({x:GATE_X-18, y:GY-84, w:36, h:84, tipo:'puerta'});
  return s;
}
const solapa = (ax,ay,aw,ah,bx,by,bw,bh) => ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;

function moverJugador(dt){
  const s = solidosCerca(p.x);
  // horizontal
  p.x += p.vx*dt;
  p.x = clamp(p.x, HW, WORLD-HW);
  for(const o of s){
    if(solapa(p.x-HW, p.y-HH, HW*2, HH, o.x, o.y, o.w, o.h)){
      if(p.vx > 0 || (p.vx === 0 && p.x < o.x + o.w/2)) p.x = o.x - HW; else p.x = o.x + o.w + HW;
      p.vx = 0;
    }
  }
  // vertical
  p.vy += GRAV*dt;
  p.y  += p.vy*dt;
  p.on = null;
  for(const o of s){
    if(solapa(p.x-HW, p.y-HH, HW*2, HH, o.x, o.y, o.w, o.h)){
      if(p.vy >= 0){ p.y = o.y; p.vy = 0; p.on = o; }
      else { p.y = o.y + o.h + HH; p.vy = 0; }
    }
  }
}
function apoyado(x,y,s){ for(const o of s){ if(o.tipo!=='movil' && x>=o.x && x<=o.x+o.w && y+2>=o.y && y+2<=o.y+o.h) return true; } return false; }

/* ---------- Jugador: acciones ---------- */
function saltar(){ bufSalto = .11; }
function atacar(){
  if(estado!=='juego' || p.atk>0) return;
  p.atk = .34; p.golpeado = false; sfx.ataque();
}
function golpeJugador(){
  const dir = p.dir, x0 = dir>0 ? p.x-6 : p.x-78, y0 = p.y-62;
  let acierto = false;
  for(const e of enemigos){
    if(!e.vivo) continue;
    if(solapa(x0,y0,84,62, e.x-e.tp.hw, e.y-e.tp.hh, e.tp.hw*2, e.tp.hh)){ danarEnemigo(e); acierto = true; }
  }
  for(const b of bloques){
    if(b.vivo && b.tipo==='grieta' && solapa(x0,y0,84,62,b.x,b.y,b.w,b.h)){
      b.vivo = false; acierto = true; sfx.romper();
      chispas(b.x+16-0, b.y+16, '#8f93ad', 10, 110); chispas(b.x+16, b.y+16, '#e0b84a', 4, 80);
      if(b.drop==='corazon') items.push({t:'corazon', x:b.x+16, y:b.y+16, ph:0, vivo:true});
    }
  }
  if(acierto){ hitstop = .05; shake = .12; }
}
function danarEnemigo(e){
  e.hp--; e.flash = .14; sfx.golpe();
  e.kb = p.dir * (e.t==='capitan' ? 90 : 170);
  chispas(e.x, e.y-e.tp.hh/2, '#ffffff', 6, 120); chispas(e.x, e.y-e.tp.hh/2, '#ff5a6a', 6, 100);
  if(e.hp <= 0){ matarEnemigo(e); return; }
  if(e.estado==='aviso' || e.estado==='carga'){ e.estado='descanso'; e.tm = .4; }
  e.cd = 1;
}
function matarEnemigo(e){
  e.vivo = false; e.muerte = .55; e.estado = 'muerto';
  chispas(e.x, e.y-e.tp.hh/2, '#ffd05a', 10, 140); chispas(e.x, e.y-e.tp.hh/2, '#ff5a6a', 10, 130);
  if(e.t==='capitan'){
    puertaAbierta = true; puertaT = 0; sfx.puerta(); shake = .6;
    items.push({t:'corazon', x:e.x, y:e.y-14, ph:0, vivo:true});
    jefeEl.classList.remove('activo');
    avisar('¡La puerta del castillo se abre! ➜', 2800);
    for(let i=0;i<24;i++) chispas(e.x, e.y-30, i%2?'#ffd05a':'#ffffff', 1, 220);
  }
}
function recibirDanio(desdeX){
  if(inv > 0 || estado!=='juego') return;
  hp--; inv = 1.2; shake = .25;
  sfx.dano();
  const dir = p.x >= desdeX ? 1 : -1;
  p.vx = dir*150; p.vy = -230; p.kb = .22; p.atk = 0;
  chispas(p.x, p.y-24, '#ff5a6a', 10, 110);
  actualizarHUD();
  if(hp <= 0) perderTodo();
  else avisar('¡Cuidado!', 900);
}
function perderTodo(){
  hp = MAXHP; actualizarHUD();
  const c = CHECKS[cpIdx];
  p.x = c.x; p.y = GY; p.vx = p.vy = 0; p.kb = 0; inv = 1.6;
  if(p.x < 4000) enemigos.forEach(e=>{ if(e.vivo && e.t!=='capitan') { e.estado='patrulla'; e.tm=0; e.cd=1; } });
  avisar('¡Ánimo! Sigue adelante ♥', 2200);
}
function caerAlAgua(){
  sfx.agua(); salpicar(p.x, GY+24); shake = .2;
  hp--; actualizarHUD();
  if(hp <= 0){ perderTodo(); return; }
  p.x = p.safeX; p.y = p.safeY; p.vx = p.vy = 0; p.kb = 0; inv = 1.4;
  avisar('¡Al agua! Vuelve a intentarlo', 1500);
}

/* ---------- Actualización ---------- */
function actualizar(dt){
  t += dt;
  // plataforma móvil sobre el río
  const nx = 2050 + 40*Math.sin(t*1.0);
  movil.dx = nx - movil.x; movil.x = nx;
  part = part.filter(q=>{ q.vida -= dt; q.x += q.vx*dt; q.y += q.vy*dt; q.vy += q.grav*dt; return q.vida > 0; });
  if(shake > 0) shake -= dt;
  if(puertaAbierta) puertaT += dt;

  if(estado === 'escena'){ actualizarEscena(dt); actualizarCamara(dt); return; }
  if(estado !== 'juego') return;

  // -------- Jugador --------
  if(p.on && p.on.tipo==='movil') p.x += movil.dx;
  let ax = 0; if(teclas.izq) ax -= 1; if(teclas.der) ax += 1;
  if(p.kb > 0){ p.kb -= dt; }
  else { p.vx = ax * VEL * (p.atk>0 ? .6 : 1); if(ax) p.dir = ax; }
  p.coyote = p.on ? .09 : Math.max(0, p.coyote - dt);
  bufSalto = Math.max(0, bufSalto - dt);
  if(bufSalto > 0 && p.coyote > 0){ p.vy = -SALTO; p.coyote = 0; bufSalto = 0; sfx.salto(); for(let i=0;i<4;i++) pt(p.x+(Math.random()-.5)*10,p.y,(Math.random()-.5)*40,-10,.3,'#cfd6ff',2,0); }
  const yAntes = p.vy;
  moverJugador(dt);
  if(p.on && yAntes > 200) for(let i=0;i<5;i++) pt(p.x+(Math.random()-.5)*14,p.y-1,(Math.random()-.5)*60,-20,.3,'#cfd6ff',2,0);
  if(p.on){
    const s = solidosCerca(p.x);
    if(p.on.tipo!=='movil' && apoyado(p.x-12,p.y,s) && apoyado(p.x+12,p.y,s)){ p.safeX = p.x; p.safeY = p.y; }
  }
  if(inv > 0) inv -= dt;
  if(p.atk > 0){
    p.atk -= dt;
    const el = .34 - p.atk;
    if(el >= .08 && !p.golpeado){ p.golpeado = true; golpeJugador(); }
    if(p.atk < 0) p.atk = 0;
  }
  if(p.y > GY + 34) caerAlAgua();
  if(p.on && Math.abs(p.vx) > 10 && p.on.tipo!=='movil') p.run += dt; else if(!p.on) p.run += dt*.5;

  // -------- Pinchos --------
  for(const s of PINCHOS){
    if(solapa(p.x-HW+2, p.y-HH, HW*2-4, HH, s.x+3, GY-11, s.w-6, 11)) recibirDanio(s.x + s.w/2);
  }
  // -------- Rosas e items --------
  for(const r of rosas){
    if(r.vivo && solapa(p.x-HW-3,p.y-HH,HW*2+6,HH, r.x-8, r.y-8, 16, 16)){
      r.vivo = false; nRosas++; sfx.rosa(); actualizarHUD(); corazonesSubir(r.x, r.y, 4);
      if(nRosas === TOTAL_ROSAS) avisar('¡Reuniste todas las rosas para Odette! ♥', 2600);
    }
  }
  for(const it of items){
    it.ph += dt;
    if(it.vivo && solapa(p.x-HW-3,p.y-HH,HW*2+6,HH, it.x-8, it.y-8, 16, 16)){
      it.vivo = false; sfx.corazon();
      if(hp < MAXHP){ hp++; actualizarHUD(); avisar('+1 ♥', 900); } else avisar('♥ ¡Ya tienes todo el corazón!', 1100);
      corazonesSubir(it.x, it.y, 5);
    }
  }
  // -------- Puntos de control --------
  for(let i = cpIdx+1; i < CHECKS.length; i++){
    if(p.x > CHECKS[i].x){ cpIdx = i; sfx.check(); avisar('♥ Punto guardado', 1400); corazonesSubir(CHECKS[i].x, GY-40, 6); }
  }
  // -------- Enemigos --------
  for(const e of enemigos) actualizarEnemigo(e, dt);
  enemigos = enemigos.filter(e=>e.vivo || e.muerte > 0);
  // jefe
  const cap = enemigos.find(e=>e.t==='capitan' && e.vivo);
  if(cap){
    const cerca = p.x > 3820;
    jefeEl.classList.toggle('activo', cerca);
    if(cerca){ cap.activo = true; jefeEl.querySelector('i').style.width = (cap.hp/cap.hpMax*100)+'%'; }
  }
  // -------- Zonas --------
  const z = zonaEn(p.x);
  if(z !== zonaActual){ zonaActual = z; mostrarZona(z); }
  // -------- Escena final --------
  if(puertaAbierta && puertaT > 1.4 && p.x > 4230) iniciarEscena();

  actualizarCamara(dt);
}

function actualizarCamara(dt){
  let obj;
  if(estado==='escena') obj = WORLD - W;
  else obj = p.x - 190 + p.dir*26;
  obj = clamp(obj, 0, WORLD - W);
  cam += (obj - cam) * Math.min(1, dt*(estado==='escena'?2.2:7));
  if(dt === 0) return;
}

function actualizarEnemigo(e, dt){
  if(!e.vivo){ e.muerte -= dt; return; }
  const tp = e.tp;
  e.ph += dt; if(e.flash > 0) e.flash -= dt; if(e.cd > 0) e.cd -= dt;
  // retroceso
  if(Math.abs(e.kb) > 4){ e.x = clamp(e.x + e.kb*dt, e.x1-30, e.x2+30); e.kb *= Math.pow(.02, dt); } else e.kb = 0;
  if(!e.activo && Math.abs(p.x - e.x) < 800) { /* el capitán espera */ }
  const dx = p.x - e.x, dy = p.y - e.y;
  const sobreMismo = Math.abs(dy) < 46;
  switch(e.estado){
    case 'patrulla':
      if(e.t==='capitan' && !e.activo) break;
      e.x += e.dir*tp.vel*dt;
      if(e.x < e.x1){ e.x = e.x1; e.dir = 1; } else if(e.x > e.x2){ e.x = e.x2; e.dir = -1; }
      if(e.cd <= 0 && Math.abs(dx) < tp.vista && sobreMismo && estado==='juego'){ e.dir = dx>0?1:-1; e.estado='aviso'; e.tm = tp.aviso; }
      break;
    case 'aviso':
      e.tm -= dt; if(e.tm <= 0){ e.estado='carga'; e.tm = .38; }
      break;
    case 'carga':
      e.x = clamp(e.x + e.dir*tp.carga*dt, e.x1-20, e.x2+20);
      if(Math.random() < .5) pt(e.x - e.dir*10, e.y-2, -e.dir*30, -10, .3, '#cfd6ff', 2, 0);
      e.tm -= dt; if(e.tm <= 0){ e.estado='descanso'; e.tm = .7; e.cd = 1.1; }
      break;
    case 'descanso':
      e.tm -= dt; if(e.tm <= 0){ e.estado='patrulla'; }
      break;
  }
  // daño por contacto
  if(estado==='juego' && solapa(p.x-HW+2,p.y-HH,HW*2-4,HH, e.x-tp.hw, e.y-tp.hh, tp.hw*2, tp.hh)) recibirDanio(e.x);
}

/* ---------- Escena final ---------- */
const LINEAS = [
  {q:'LANCELOT', txt:'Crucé bosques y cascadas solo para verte, Odette.'},
  {q:'ODETTE',   txt:'Sabía que llegarías, mi Lancelot ♥'},
  {q:'LANCELOT', txt:'Te traje {N} rosas. Yo haría todo por ti.'}
];
function iniciarEscena(){
  estado = 'escena'; teclas.izq = teclas.der = false; p.vx = 0; p.atk = 0; inv = 0;
  esc = {t:0, linea:-1, lt:0, fin:false, blanco:0, corazonT:0, odX:GATE_X, odA:0, pasos:0};
  jefeEl.classList.remove('activo'); avisoEl.classList.remove('visible');
}
function ponerLinea(i){
  esc.linea = i; esc.lt = 0;
  if(i >= LINEAS.length){ esc.fin = true; esc.finT = 0; dlgEl.classList.remove('activo'); return; }
  dlgEl.classList.add('activo'); dlgEl.classList.toggle('odette', LINEAS[i].q==='ODETTE');
  dlgEl.querySelector('.quien').textContent = LINEAS[i].q;
}
function avanzarDialogo(){
  if(estado!=='escena' || !esc || esc.linea < 0 || esc.fin) return;
  const l = LINEAS[esc.linea]; const txt = l.txt.replace('{N}', nRosas);
  if(esc.lt*30 < txt.length) esc.lt = txt.length/30 + .01; else ponerLinea(esc.linea+1);
}
function actualizarEscena(dt){
  esc.t += dt;
  // Lancelot camina hacia la puerta
  const meta = 4262;
  if(p.x < meta){ p.x += 70*dt; p.dir = 1; p.run += dt; p.vy = 0; p.y = GY; }
  else if(esc.linea < 0 && esc.t > 2.2) { /* llegó */ }
  // Odette aparece
  if(esc.t > 1.7){
    esc.odA = Math.min(1, esc.odA + dt/.9);
    if(esc.odX > 4302){ esc.odX -= 20*dt; esc.pasos += dt; }
    if(Math.random() < dt*22) pt(GATE_X+(Math.random()-.5)*30, GY-80, (Math.random()-.5)*20, 20+Math.random()*20, 1.5, Math.random()>.5?'#ffb7d0':'#fff3e6', 2, 0);
  }
  if(esc.linea < 0 && esc.t > 3.6 && p.x >= meta) ponerLinea(0);
  if(esc.linea >= 0 && !esc.fin){
    esc.lt += dt;
    const l = LINEAS[esc.linea]; const txt = l.txt.replace('{N}', nRosas);
    dlgEl.querySelector('.texto').textContent = txt.slice(0, Math.min(txt.length, Math.floor(esc.lt*30)));
    if(esc.lt > txt.length/30 + 2.4) ponerLinea(esc.linea+1);
    if(esc.linea >= 1){ esc.corazonT -= dt; if(esc.corazonT <= 0){ esc.corazonT = .22; corazonesSubir((p.x+esc.odX)/2, GY-70, 1); } }
  }
  if(esc.fin){
    esc.finT += dt;
    if(Math.random() < .7) corazonesSubir((p.x+esc.odX)/2, GY-40, 2);
    esc.blanco = clamp((esc.finT-1.2)/1.1, 0, 1);
    if(esc.finT > 2.4){ terminarEscena(); }
  }
}
function terminarEscena(){
  if(estado === 'fin') return;
  estado = 'fin'; corriendo = false;
  dlgEl.classList.remove('activo');
  $('victoria-rosas').textContent = 'Le llevaste ' + nRosas + ' de ' + TOTAL_ROSAS + ' rosas 🌹';
  pantallaMbl.classList.remove('visible');
  setTimeout(()=>pantallaMbl.classList.remove('activa'), 400);
  pantallaVict.classList.add('activa');
  requestAnimationFrame(()=>pantallaVict.classList.add('visible'));
}

/* =====================================================================
   DIBUJO
   ===================================================================== */
const SKY = [
  {p:0,   top:'#060a24', bot:'#1a2866'},
  {p:.35, top:'#0c1848', bot:'#3a3f92'},
  {p:.62, top:'#26195e', bot:'#8b4b9c'},
  {p:.86, top:'#5c2f7c', bot:'#f08a7e'},
  {p:1,   top:'#7b4c9e', bot:'#ffcf94'}
];
function colorCielo(p){
  for(let i=0;i<SKY.length-1;i++){
    const a=SKY[i], b=SKY[i+1];
    if(p<=b.p){ const u=(p-a.p)/(b.p-a.p); return [mix(a.top,b.top,u), mix(a.bot,b.bot,u)]; }
  }
  return [SKY[SKY.length-1].top, SKY[SKY.length-1].bot];
}

function dibujar(){
  ctx.setTransform(K,0,0,K,0,0);
  ctx.imageSmoothingEnabled = true;
  const camx = Math.round(cam);
  const prog = clamp((cam + 240) / (WORLD - 60), 0, 1);
  let sx = 0, sy = 0;
  if(shake > 0){ sx = Math.round((Math.random()-.5)*4); sy = Math.round((Math.random()-.5)*3); }
  ctx.save(); ctx.translate(sx, sy);

  dibujarCielo(camx, prog);
  dibujarMontanas(camx, prog);
  dibujarArboles(camx, prog, .38, 176, 0, .55);
  dibujarAcantilados(camx, prog);
  dibujarArboles(camx, prog, .62, 200, 1, 1);
  dibujarNiebla(camx, prog);
  dibujarPozos(camx);
  dibujarSuelos(camx, prog);
  dibujarCascadasFrente(camx);
  dibujarCastillo(camx);
  dibujarDecoracion(camx);
  dibujarBloques(camx);
  dibujarPinchos(camx);
  dibujarChecks(camx);
  dibujarItems(camx);
  dibujarEnemigos(camx);
  dibujarOdette(camx);
  dibujarJugador(camx);
  dibujarParticulas(camx);
  dibujarLuciernagas(camx, prog);
  ctx.restore();
  ctx.drawImage(viñeta, 0, 0, W, H);
  if(estado==='escena' && esc){
    const b = Math.min(1, esc.t/.8) * 26;
    R(0,0,W,b,'#08041a'); R(0,H-b,W,b,'#08041a');
    if(esc.blanco > 0){ ctx.globalAlpha = esc.blanco; R(0,0,W,H,'#fff6e8'); ctx.globalAlpha = 1; }
  }
}

/* ---- Cielo ---- */
function dibujarCielo(camx, prog){
  const c = colorCielo(prog);
  const g = ctx.createLinearGradient(0,0,0,GY);
  g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  // estrellas
  const va = clamp(1 - prog*1.25, 0, 1);
  if(va > 0){
    for(const s of estrellas){
      const tw = .55 + .45*Math.sin(t*1.6 + s.ph);
      ctx.globalAlpha = va*tw; R(((s.x - camx*.03)%W+W)%W, s.y, s.s, s.s, '#fff6d8');
    }
    ctx.globalAlpha = 1;
  }
  // luna
  const la = clamp(1 - prog*1.5, 0, 1);
  if(la > 0){
    ctx.globalAlpha = la;
    const mx = 366 - camx*.02, my = 58;
    const gl = ctx.createRadialGradient(mx,my,4,mx,my,46); gl.addColorStop(0,'rgba(255,240,200,.45)'); gl.addColorStop(1,'rgba(255,240,200,0)');
    ctx.fillStyle = gl; ctx.fillRect(mx-50,my-50,100,100);
    ctx.fillStyle = '#fff2c9'; ctx.beginPath(); ctx.arc(mx,my,15,0,6.283); ctx.fill();
    ctx.fillStyle = mix('#fff2c9','#c9c2a0',.6); ctx.beginPath(); ctx.arc(mx-5,my-3,3,0,6.283); ctx.arc(mx+5,my+5,2.4,0,6.283); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // amanecer
  const sa = clamp((prog-.7)/.3, 0, 1);
  if(sa > 0){
    const sxp = 300 - camx*.01 + (estado==='escena'?0:0), syp = GY - 40 - ease(sa)*46;
    const gl = ctx.createRadialGradient(sxp,syp,6,sxp,syp,150);
    gl.addColorStop(0,'rgba(255,224,150,'+(.75*sa)+')'); gl.addColorStop(.4,'rgba(255,150,130,'+(.32*sa)+')'); gl.addColorStop(1,'rgba(255,150,130,0)');
    ctx.fillStyle = gl; ctx.fillRect(0,0,W,GY+20);
    ctx.globalAlpha = sa; ctx.fillStyle = '#fff1c2'; ctx.beginPath(); ctx.arc(sxp,syp,17,0,6.283); ctx.fill(); ctx.globalAlpha = 1;
  }
  // nubes pixeladas
  for(let i=0;i<7;i++){
    const nx = (((i*190 + t*(3+i%3) - camx*(.05+.02*(i%3))) % (W+160)) + (W+160)) % (W+160) - 80;
    const ny = 28 + (i*37)%90;
    ctx.globalAlpha = .22 + .08*(i%3);
    const cc = mix('#8fa2e8','#ffc6b0',prog);
    R(nx,ny,46,6,cc); R(nx+8,ny-5,26,6,cc); R(nx+20,ny+5,40,4,cc);
  }
  ctx.globalAlpha = 1;
  // castillo lejano (meta a la vista)
  const ca = clamp(1 - Math.max(0,(prog-.62))/.25, 0, 1);
  if(ca > 0){
    ctx.globalAlpha = ca*.9;
    const cx = 392 - camx*.012, by = 160;
    const col = mix('#2a3688','#9a5e9c',prog);
    R(cx-22,by-16,44,20,col); R(cx-30,by-30,10,34,col); R(cx+20,by-30,10,34,col); R(cx-6,by-40,12,44,col);
    for(let k=0;k<3;k++){ R(cx-30+k*4,by-34,2,4,col); R(cx+20+k*4,by-34,2,4,col); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx-8,by-40); ctx.lineTo(cx,by-54); ctx.lineTo(cx+8,by-40); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx-32,by-30); ctx.lineTo(cx-25,by-42); ctx.lineTo(cx-18,by-30); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx+18,by-30); ctx.lineTo(cx+25,by-42); ctx.lineTo(cx+32,by-30); ctx.fill();
    const tw2 = (Math.sin(t*2)>0) ? '#ffe08a' : '#ffc45a';
    R(cx-1,by-30,3,5,tw2); R(cx-26,by-22,2,4,tw2); R(cx+24,by-22,2,4,tw2); R(cx-10,by-8,2,3,tw2); R(cx+8,by-8,2,3,tw2);
    ctx.globalAlpha = 1;
  }
}

/* ---- Montañas ---- */
function dibujarMontanas(camx, prog){
  const caps = [
    {par:.10, base:150, amp:40, c1:'#26387f', c2:'#c47aa8', f:[.0061,.0173,.041], ph:[0,1.3,2.1]},
    {par:.22, base:178, amp:32, c1:'#1b2a6d', c2:'#9a5693', f:[.0074,.0151,.037], ph:[2.2,.4,1.1]},
    {par:.36, base:204, amp:24, c1:'#131e56', c2:'#6c3c80', f:[.0093,.021,.05],  ph:[.9,2.6,.3]}
  ];
  for(const L of caps){
    ctx.fillStyle = mix(L.c1, L.c2, prog);
    ctx.beginPath(); ctx.moveTo(0, GY+6);
    for(let x=0; x<=W; x+=6){
      const wx = x + camx*L.par;
      const n = Math.sin(wx*L.f[0]+L.ph[0])*.55 + Math.sin(wx*L.f[1]+L.ph[1])*.3 + Math.sin(wx*L.f[2]+L.ph[2])*.15;
      ctx.lineTo(x, L.base - L.amp*(.5+.5*n));
    }
    ctx.lineTo(W, GY+6); ctx.closePath(); ctx.fill();
  }
  // resplandor del horizonte
  const hg = ctx.createLinearGradient(0,GY-90,0,GY);
  hg.addColorStop(0,'rgba(255,170,140,0)'); hg.addColorStop(1,'rgba(255,170,140,'+(.06+prog*.34)+')');
  ctx.fillStyle = hg; ctx.fillRect(0,GY-90,W,90);
}

/* ---- Árboles (pinos) ---- */
function dibujarArboles(camx, prog, par, baseY, capa, escala){
  const cell = capa ? 58 : 40;
  const c0 = Math.floor(camx*par/cell) - 1, c1 = Math.floor((camx*par + W)/cell) + 1;
  const dark = capa ? mix('#0c3a34','#3f3766',prog*.7) : mix('#12305a','#5a4680',prog*.75);
  const lite = capa ? mix('#14574a','#5b4a86',prog*.7) : mix('#1a4670','#7a5c98',prog*.75);
  for(let c=c0;c<=c1;c++){
    const lx = c*cell + hash(c*3.1+capa)*cell*.7;
    const xw = lx/par;                       // x del mundo equivalente
    const z = zonaEn(xw);
    const prob = z===0 ? .85 : z===1 ? .3 : z===2 ? .18 : .22;
    if(hash(c*7.7+capa*13) > prob) continue;
    const h = (capa? 52 : 34) + hash(c*1.9)*(capa? 34 : 20);
    const x = Math.round(lx - camx*par), y = baseY + 6;
    const w = (capa? 26 : 18) * (.85 + hash(c*5.3)*.4) * escala;
    R(x-1, y-8, 3, 8, '#2a1c2e');
    for(let k=0;k<4;k++){
      const ty = y - 8 - k*(h/4.6), ww = w*(1 - k*.2);
      ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(x-ww, ty); ctx.lineTo(x, ty - h/3.1); ctx.lineTo(x+ww, ty); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lite; ctx.beginPath(); ctx.moveTo(x-ww*.15, ty-1); ctx.lineTo(x, ty - h/3.1); ctx.lineTo(x+ww*.55, ty-1); ctx.closePath(); ctx.fill();
    }
  }
}

/* ---- Cascada (dibujo reutilizable) ---- */
function cascada(x, yTop, yBot, ancho, alfa){
  ctx.globalAlpha = alfa;
  R(x, yTop, ancho, yBot-yTop, '#6db6f2');
  R(x+2, yTop, ancho-4, yBot-yTop, '#9ad4ff');
  R(x+ancho*.4, yTop, 2, yBot-yTop, '#e8f7ff');
  for(let i=0;i<Math.ceil(ancho/4);i++){
    const off = (t*70*(.8+hash(i+x)*.6) + hash(i*3+x)*100) % 44;
    for(let y=yTop - 44 + off; y < yBot; y += 44){
      const yy = Math.max(y, yTop);
      const hh = Math.min(y+16, yBot) - yy; if(hh > 0) R(x+2+i*4, yy, 2, hh, '#ffffff');
    }
  }
  ctx.globalAlpha = 1;
  // espuma y bruma abajo
  ctx.globalAlpha = alfa*.55;
  for(let i=0;i<7;i++){ const ox = Math.sin(t*2+i)*ancho*.6; const r = 5 + (i%3)*3; ctx.fillStyle='#eaf7ff'; ctx.beginPath(); ctx.arc(x+ancho/2+ox, yBot-2-(i%3)*2, r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
}

/* ---- Acantilados con cascadas (fondo) ---- */
function dibujarAcantilados(camx, prog){
  const par = .55, cell = 150;
  const c0 = Math.floor(camx*par/cell) - 1, c1 = Math.floor((camx*par + W)/cell) + 1;
  for(let c=c0;c<=c1;c++){
    const xw = (c*cell + cell/2)/par;
    const z = zonaEn(xw);
    if(z!==1 && z!==2) continue;
    if(z===1 && xw < 1450) continue;
    const hh = hash(c*2.3);
    const cw = 90 + hash(c*4.1)*50, top = 46 + hh*70;
    const x = Math.round(c*cell + (cell-cw)/2 - camx*par);
    const rock = mix('#2c3268','#6c4a86',prog*.8), rockL = mix('#3d4488','#88609c',prog*.8), rockD = mix('#1c2050','#4e3468',prog*.8);
    R(x, top, cw, GY-top+6, rock);
    R(x, top, 5, GY-top+6, rockL);
    R(x+cw-6, top, 6, GY-top+6, rockD);
    for(let k=0;k<6;k++){ const yy = top + 10 + hash(c*9+k)*(GY-top-30); R(x+8+hash(c+k*5)*(cw-24), yy, 10+hash(k+c)*10, 3, rockL); R(x+10+hash(c*2+k*3)*(cw-30), yy+8, 12, 3, rockD); }
    R(x-2, top-3, cw+4, 6, mix('#2f8a66','#7a7a8c',prog*.5));
    R(x+4, top-6, 14, 4, mix('#3fae6d','#8a8a9a',prog*.5));
    if(hash(c*6.6) > .35){
      const wx = x + cw*.5 - 9, wa = 16 + Math.floor(hash(c*8)*8);
      cascada(wx, top+2, GY+2, wa, .85);
    }
  }
}

/* ---- Bruma ---- */
function dibujarNiebla(camx, prog){
  const z = zonaEn(camx + W/2);
  const a = (z===1||z===2) ? .22 : .08;
  const g = ctx.createLinearGradient(0,GY-80,0,GY+10);
  g.addColorStop(0,'rgba(200,225,255,0)'); g.addColorStop(1,'rgba(200,225,255,'+a+')');
  ctx.fillStyle = g; ctx.fillRect(0,GY-80,W,90);
}

/* ---- Agua ---- */
function agua(x1, x2, yTop){
  const g = ctx.createLinearGradient(0,yTop,0,H);
  g.addColorStop(0,'#3f8ee0'); g.addColorStop(.25,'#1e56b4'); g.addColorStop(1,'#0a2266');
  ctx.fillStyle = g; ctx.fillRect(Math.round(x1), yTop, Math.round(x2-x1), H-yTop);
  for(let x = Math.floor(x1/6)*6; x < x2; x += 6){
    const yy = yTop + Math.sin(x*.21 + t*3)*1.6;
    R(x, yy, 4, 1, '#bfe6ff');
    if(hash(x*.37 + Math.floor(t*2))>.8) R(x+1, yy+5, 3, 1, '#7fc0ff');
  }
}
function dibujarPozos(camx){
  for(const pz of POZOS){
    if(pz.x2 < camx-30 || pz.x1 > camx+W+30) continue;
    const x1 = pz.x1 - camx, x2 = pz.x2 - camx;
    // roca del fondo
    R(x1, GY+4, x2-x1, H-GY, '#1a1740');
    agua(x1, x2, GY+22);
    if(pz.cascada){
      // pared de roca con la caída de agua
      const cx = (x1+x2)/2, rw = Math.min(64, (x2-x1)-6);
      R(cx-rw/2, 26, rw, GY-4, '#3a3f78'); R(cx-rw/2, 26, 4, GY-4, '#545a9a'); R(cx+rw/2-5, 26, 5, GY-4, '#242858');
      for(let k=0;k<5;k++){ R(cx-rw/2+6+hash(k+pz.x1)*(rw-26), 40+hash(k*3+pz.x1)*130, 12, 3, '#545a9a'); }
      R(cx-rw/2-2, 22, rw+4, 6, '#2f8a66');
    }
  }
}
function dibujarCascadasFrente(camx){
  for(const pz of POZOS){
    if(!pz.cascada || pz.x2 < camx-30 || pz.x1 > camx+W+30) continue;
    const cx = (pz.x1+pz.x2)/2 - camx;
    cascada(cx-9, 28, GY+24, 18, .9);
    if(Math.random() < .3) pt(pz.x1+(pz.x2-pz.x1)/2+(Math.random()-.5)*26, GY+22, (Math.random()-.5)*50, -50-Math.random()*40, .5, '#dff2ff', 2, 300);
  }
}

/* ---- Suelos ---- */
const SUELO_COL = [
  {cuerpo:'#3b2450', claro:'#4d3164', osc:'#2a1840', top:'#4dbf62', topL:'#8fe08a', topD:'#2f8a48'},
  {cuerpo:'#2e3468', claro:'#41498a', osc:'#1f2450', top:'#37b59a', topL:'#7ff0c8', topD:'#237c6c'},
  {cuerpo:'#5d5588', claro:'#7770a4', osc:'#463e6c', top:'#a89bd0', topL:'#d6ccf2', topD:'#6f6598'},
  {cuerpo:'#6a5a8e', claro:'#85759f', osc:'#4c3f72', top:'#c3b3dc', topL:'#f0e6ff', topD:'#8a7aa8'}
];
function bloqueSuelo(x1, x2, top, z, camx, prog){
  const c = SUELO_COL[z];
  const a = Math.max(x1, camx-16), b = Math.min(x2, camx+W+16);
  if(b <= a) return;
  const cuerpo = mix(c.cuerpo, '#7a5aa0', prog*.18);
  R(a-camx, top, b-a, H-top, cuerpo);
  for(let cx=Math.floor(a/16)*16; cx<b; cx+=16){
    for(let cy=top+8; cy<H; cy+=16){
      const h = hash(cx*.37+cy*1.7);
      if(z===3){
        R(cx-camx, cy-8+ (Math.floor(cx/16)%2)*8, 16, 1, c.osc); R(cx-camx, cy-8, 1, 8, c.osc);
      } else {
        if(h>.72) R(cx-camx+2+hash(cx+cy)*6, cy, 6, 3, c.claro);
        else if(h<.16) R(cx-camx+3, cy+2, 5, 3, c.osc);
      }
    }
  }
  // borde superior
  R(a-camx, top, b-a, 6, c.top);
  R(a-camx, top, b-a, 2, c.topL);
  R(a-camx, top+6, b-a, 2, c.topD);
  if(z < 2){
    for(let cx=Math.floor(a/8)*8; cx<b; cx+=8){
      const h = hash(cx*.71);
      if(h>.55) R(cx-camx, top-3, 2, 3, c.topL);
      if(h>.9)  { R(cx-camx, top-6, 1, 3, '#3f9a48'); R(cx-camx-1, top-8, 3, 3, hash(cx)>.5?'#ff9ac0':'#ffe08a'); }
      if(z===0 && h<.06) { R(cx-camx, top-4, 2, 4, '#2f8a48'); }
    }
  }
  // caras laterales oscuras en los bordes reales
  if(x1 >= camx-16) R(x1-camx, top, 3, H-top, c.osc);
  if(x2 <= camx+W+16) R(x2-camx-3, top, 3, H-top, c.osc);
}
function dibujarPuente(x1, x2, camx){
  const a = Math.max(x1, camx-16), b = Math.min(x2, camx+W+16);
  const yD = GY + 12;
  // fondo de piedra y arcos con agua
  R(a-camx, yD, b-a, H-yD, '#4a4270');
  const luz = 100, r = 41;
  for(let px = x1 + 50; px < x2; px += luz){
    if(px < camx-60 || px > camx+W+60) continue;
    const cx = px - camx, cy = GY + 12 + r;
    ctx.fillStyle = '#1a3d8a';
    ctx.beginPath(); ctx.moveTo(cx-r, H); ctx.lineTo(cx-r, cy); ctx.arc(cx, cy, r, Math.PI, Math.PI*2); ctx.lineTo(cx+r, H); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx-r, H); ctx.lineTo(cx-r, cy); ctx.arc(cx, cy, r, Math.PI, Math.PI*2); ctx.lineTo(cx+r, H); ctx.closePath(); ctx.clip();
    agua(cx-r, cx+r, cy+r*.35);
    ctx.restore();
    ctx.strokeStyle = '#8c84b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r+1, Math.PI, Math.PI*2); ctx.stroke();
  }
  // tablero
  R(a-camx, GY, b-a, 12, '#8d86b8');
  R(a-camx, GY, b-a, 3, '#c3bce8');
  R(a-camx, GY+9, b-a, 3, '#5d5690');
  for(let cx=Math.floor(a/24)*24; cx<b; cx+=24) R(cx-camx, GY+3, 1, 6, '#5d5690');
  // barandal (pilares bajos)
  for(let cx=Math.floor(a/48)*48; cx<b; cx+=48){ R(cx-camx, GY-9, 6, 9, '#8d86b8'); R(cx-camx, GY-9, 6, 2, '#c3bce8'); R(cx-camx+6, GY-5, 42, 2, '#6d6698'); }
}
function dibujarSuelos(camx, prog){
  for(const g of TRAMOS){
    if(g[1] < camx-20 || g[0] > camx+W+20) continue;
    if(g[0]===2860) dibujarPuente(g[0], g[1], camx);
    else bloqueSuelo(g[0], g[1], GY, zonaEn(g[0]+1), camx, prog);
  }
  bloqueSuelo(MESETA.x, MESETA.x+MESETA.w, MESETA.y, 1, camx, prog);
  // plataforma móvil (tablón de madera con runas)
  if(movil){
    const x = movil.x - movil.w/2 - camx, y = movil.y;
    R(x, y, movil.w, 10, '#6a4a34'); R(x, y, movil.w, 3, '#b58a5a'); R(x, y+7, movil.w, 3, '#3f2a1e');
    for(let k=0;k<4;k++) R(x+6+k*16, y+3, 2, 4, '#3f2a1e');
    R(x+movil.w/2-3, y+3, 6, 4, '#7fa8ff');
  }
}

/* ---- Bloques ---- */
function dibujarBloques(camx){
  for(const b of bloques){
    if(!b.vivo || b.x+32 < camx-4 || b.x > camx+W+4) continue;
    const x = Math.round(b.x - camx), y = b.y, z = zonaEn(b.x);
    let face='#8f93ad', luz='#c8ccE6', osc='#585b7a';
    if(b.tipo==='grieta'){ face='#7d7794'; luz='#aca6c4'; osc='#4e4868'; }
    if(b.tipo==='runa'){ face='#4b4f8a'; luz='#7e84d0'; osc='#2c2f5c'; }
    R(x-1,y-1,34,34,'#22233f');
    R(x,y,32,32,face); R(x,y,32,3,luz); R(x,y,3,32,luz); R(x,y+29,32,3,osc); R(x+29,y,3,32,osc);
    R(x+6,y+6,20,1,osc); R(x+6,y+25,20,1,luz); 
    if(b.tipo==='piedra'){
      R(x+6,y+10,4,3,osc); R(x+19,y+17,6,3,osc); R(x+11,y+21,3,2,luz);
      if(z<=1){ R(x,y-1,32,4,'#4dbf62'); R(x+2,y-3,9,3,'#8fe08a'); R(x+20,y-2,8,2,'#8fe08a'); R(x+5,y+3,2,4,'#3f9a48'); R(x+24,y+3,2,6,'#3f9a48'); }
    }
    if(b.tipo==='grieta'){
      ctx.strokeStyle = '#1e1a34'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(x+16,y+2); ctx.lineTo(x+13,y+10); ctx.lineTo(x+19,y+15); ctx.lineTo(x+14,y+23); ctx.lineTo(x+17,y+30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+19,y+15); ctx.lineTo(x+27,y+13); ctx.stroke();
      if(Math.sin(t*4 + b.x)>.6) R(x+22,y+6,2,2,'#ffe9a8');
      if(b.drop) { R(x+5,y+22,3,3,'#ff7fa8'); }
    }
    if(b.tipo==='runa'){
      const gl = .55 + .45*Math.sin(t*2.4 + b.x*.1);
      ctx.globalAlpha = gl*.5; ctx.fillStyle = '#7fc0ff'; ctx.beginPath(); ctx.arc(x+16,y+16,15,0,6.283); ctx.fill(); ctx.globalAlpha = 1;
      ctx.globalAlpha = .6+gl*.4;
      R(x+15,y+8,2,16,'#cfe8ff'); R(x+8,y+15,16,2,'#cfe8ff'); R(x+12,y+12,8,8,'#7fc0ff'); R(x+14,y+14,4,4,'#ffffff');
      ctx.globalAlpha = 1;
    }
    if(b.liana){
      for(let k=0;k<3;k++){ const lx = x+5+k*11, ll = 8 + hash(b.x+k)*14; R(lx, y+32, 2, ll, '#3f9a48'); R(lx-1, y+32+ll-3, 4, 3, '#67d078'); }
    }
  }
}

/* ---- Pinchos ---- */
function dibujarPinchos(camx){
  for(const s of PINCHOS){
    if(s.x+s.w < camx-4 || s.x > camx+W+4) continue;
    for(let x=s.x; x < s.x+s.w; x+=16){
      const sx = Math.round(x - camx);
      ctx.fillStyle = '#c9cfe6'; ctx.beginPath(); ctx.moveTo(sx,GY); ctx.lineTo(sx+8,GY-13); ctx.lineTo(sx+16,GY); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7f86a8'; ctx.beginPath(); ctx.moveTo(sx+8,GY-13); ctx.lineTo(sx+16,GY); ctx.lineTo(sx+8,GY); ctx.closePath(); ctx.fill();
      R(sx+7, GY-11, 1, 6, '#ffffff');
    }
  }
}

/* ---- Puntos de control ---- */
function dibujarChecks(camx){
  CHECKS.forEach((c,i)=>{
    if(i===0 || c.x < camx-30 || c.x > camx+W+30) return;
    const x = Math.round(c.x - camx), act = i <= cpIdx;
    R(x, GY-46, 3, 46, '#e6dcc8'); R(x-1, GY-48, 5, 3, act?'#ffe9a8':'#9aa3c4');
    const ond = Math.sin(t*4)*2;
    ctx.fillStyle = act ? '#e0b84a' : '#2952c4';
    ctx.beginPath(); ctx.moveTo(x+3,GY-44); ctx.lineTo(x+24+ond,GY-38); ctx.lineTo(x+3,GY-28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = act ? '#ffe9a8' : '#7fa8ff'; ctx.beginPath(); ctx.moveTo(x+3,GY-44); ctx.lineTo(x+14+ond/2,GY-40); ctx.lineTo(x+3,GY-38); ctx.closePath(); ctx.fill();
    if(act){ ctx.globalAlpha = .25; ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(x+8,GY-36,22,0,6.283); ctx.fill(); ctx.globalAlpha = 1; }
  });
}

/* ---- Rosas y corazones ---- */
const ART_ROSA = [
  '..rrrrr..',
  '.rRRhRRr.',
  'rRRhRRRRr',
  'rRRRRhRRr',
  '.rRRRRRr.',
  '..rrRrr..',
  '....g....',
  '..g.g....',
  '...ggg...',
  '....g.g..',
  '....gg...'
];
const ART_CORAZON = [
  '.rr...rr.',
  'rRRr.rRRr',
  'rRhRrRRRr',
  'rRRRRRRRr',
  '.rRRRRRr.',
  '..rRRRr..',
  '...rRr...',
  '....r....'
];
function arte(art, x, y, pal){
  for(let j=0;j<art.length;j++) for(let i=0;i<art[j].length;i++){ const c = pal[art[j][i]]; if(c) R(x+i, y+j, 1, 1, c); }
}
const PAL_ROSA = {r:'#8e1236', R:'#e0284f', h:'#ff9ab0', g:'#3f9a48'};
const PAL_CORA = {r:'#a3245a', R:'#ff5f95', h:'#ffd0e0'};
function dibujarItems(camx){
  for(const r of rosas){
    if(!r.vivo || r.x < camx-20 || r.x > camx+W+20) continue;
    const x = r.x - camx, y = r.y + Math.sin(t*2.4 + r.ph)*2.5;
    ctx.globalAlpha = .3 + .12*Math.sin(t*3+r.ph); ctx.fillStyle = '#ff7fa8'; ctx.beginPath(); ctx.arc(x, y, 13, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    arte(ART_ROSA, Math.round(x-4), Math.round(y-6), PAL_ROSA);
    if(Math.sin(t*5+r.ph) > .8) R(x+5, y-7, 2, 2, '#ffffff');
  }
  for(const it of items){
    if(!it.vivo || it.x < camx-20 || it.x > camx+W+20) continue;
    const x = it.x - camx, y = it.y + Math.sin(t*3 + it.ph)*3;
    ctx.globalAlpha = .35; ctx.fillStyle = '#ffd0e0'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    arte(ART_CORAZON, Math.round(x-4), Math.round(y-4), PAL_CORA);
  }
}

/* ---- Enemigos ---- */
function dibujarEnemigos(camx){
  for(const e of enemigos){
    if(e.x < camx-80 || e.x > camx+W+80) continue;
    const img = IMG[e.tp.img]; if(!img || !img.naturalWidth) continue;
    const w = img.naturalWidth/2*e.tp.esc, h = img.naturalHeight/2*e.tp.esc;
    let alfa = 1, giro = 0, esc = 1, oy = 0, ox = 0;
    if(!e.vivo){ const u = 1 - e.muerte/.55; alfa = 1 - u; giro = u*5*e.dir; oy = -u*24; esc = 1 - u*.4; }
    else if(e.estado==='patrulla'){ oy = -Math.abs(Math.sin(e.ph*8))*2; giro = Math.sin(e.ph*8)*.06; }
    else if(e.estado==='aviso'){ ox = Math.sin(e.ph*60)*1.2; giro = -.28; oy = -3; }
    else if(e.estado==='carga'){ giro = .3; oy = -2; }
    else if(e.estado==='descanso'){ giro = Math.sin(e.ph*14)*.04; }
    // sombra
    ctx.globalAlpha = .28*alfa; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x-camx, e.y+1, w*.42, 3.5, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); ctx.globalAlpha = alfa;
    ctx.translate(Math.round(e.x-camx+ox), Math.round(e.y+oy));
    ctx.rotate(giro*e.dir); ctx.scale(e.dir>0 ? -esc : esc, esc);
    ctx.drawImage(img, -w/2, -h+2, w, h);
    if(e.flash > 0){ ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7*alfa; ctx.drawImage(img, -w/2, -h+2, w, h); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore(); ctx.globalAlpha = 1;
    if(e.vivo && e.estado==='aviso'){
      const yy = e.y - e.tp.hh - 12;
      R(e.x-camx-2, yy, 4, 8, '#ff4f6a'); R(e.x-camx-2, yy+10, 4, 3, '#ff4f6a');
    }
    if(e.vivo && e.hp < e.hpMax && e.t!=='capitan'){
      const bx = e.x-camx-10, by = e.y - e.tp.hh - 8;
      R(bx-1,by-1,22,5,'#10082a'); R(bx,by,20*e.hp/e.hpMax,3,'#ff5a6a');
    }
  }
}

/* ---- Jugador ---- */
function dibujarJugador(camx){
  if(estado==='fin') return;
  let pose = 'idle', bob = 0;
  if(estado==='escena' && esc){
    if(p.x < 4262) pose = (Math.floor(p.run*8)%2) ? 'crouch' : 'run';
    else pose = 'rose';
  } else if(inv > .95) pose = p.on ? 'kneel' : 'jump';
  else if(p.atk > 0) pose = (.34 - p.atk) < .08 ? 'raise' : 'lunge';
  else if(!p.on) pose = 'jump';
  else if(Math.abs(p.vx) > 10){ pose = (Math.floor(p.run*9)%2) ? 'crouch' : 'run'; bob = -Math.abs(Math.sin(p.run*9*Math.PI))*1.5; }
  else bob = Math.sin(t*3)*.6;
  const img = IMG[pose]; if(!img || !img.naturalWidth) return;
  const w = img.naturalWidth/2, h = img.naturalHeight/2, ax = ANC[pose]/2;
  // sombra
  const sobre = p.on ? 1 : clamp(1 - (GY-p.y)/120, .4, 1);
  ctx.globalAlpha = .3*sobre; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x-camx, (p.on? p.y : GY)+1, 16, 3.5, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
  ctx.save();
  if(inv > 0 && Math.floor(t*22)%2 === 0) ctx.globalAlpha = .45;
  ctx.translate(Math.round(p.x-camx), Math.round(p.y + bob + (pose==='jump'?5:0)));
  ctx.scale(p.dir, 1);
  // arco del tajo
  if(pose==='lunge'){
    const u = clamp(((.34 - p.atk) - .08)/.22, 0, 1);
    const a0 = -1.35, a1 = a0 + 2.5*ease(u);
    ctx.save(); ctx.translate(16,-28);
    ctx.lineCap = 'round';
    ctx.globalAlpha = (1-u*.75)*.55; ctx.strokeStyle = '#2a6bff'; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(0,0,40,a0,a1); ctx.stroke();
    ctx.globalAlpha = (1-u*.75)*.9;  ctx.strokeStyle = '#8fd0ff'; ctx.lineWidth = 6;  ctx.beginPath(); ctx.arc(0,0,40,a0,a1); ctx.stroke();
    ctx.globalAlpha = (1-u*.6);      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;  ctx.beginPath(); ctx.arc(0,0,40,a0+.2,a1); ctx.stroke();
    ctx.restore();
  }
  ctx.drawImage(img, -ax, -h, w, h);
  ctx.restore(); ctx.globalAlpha = 1;
}

/* ---- Odette (escena final) ---- */
function dibujarOdette(camx){
  if(estado!=='escena' || !esc || esc.odA <= 0) return;
  const img = IMG.odette; if(!img || !img.naturalWidth) return;
  const h = 66, w = img.naturalWidth/img.naturalHeight*h;
  const x = esc.odX - camx, y = GY;
  ctx.globalAlpha = esc.odA*.55; 
  const g = ctx.createRadialGradient(x,y-34,4,x,y-34,52); g.addColorStop(0,'rgba(255,240,200,.9)'); g.addColorStop(1,'rgba(255,240,200,0)');
  ctx.fillStyle = g; ctx.fillRect(x-56,y-90,112,110);
  ctx.globalAlpha = esc.odA;
  ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x,y+1,15,3.4,0,0,6.283); ctx.fill();
  const bob = Math.sin(esc.pasos*8)*1.2;
  ctx.drawImage(img, Math.round(x-w/2), Math.round(y-h+bob), w, h);
  ctx.globalAlpha = 1;
}

/* ---- Partículas ---- */
function dibujarParticulas(camx){
  for(const q of part){
    const a = clamp(q.vida/q.max*1.6, 0, 1);
    ctx.globalAlpha = a;
    if(q.tipo==='corazon'){ arte(ART_CORAZON, Math.round(q.x-camx-4), Math.round(q.y-4), PAL_CORA); }
    else R(q.x-camx, q.y, q.size, q.size, q.color);
  }
  ctx.globalAlpha = 1;
}

/* ---- Luciérnagas / pétalos ---- */
function dibujarLuciernagas(camx, prog){
  const z = zonaEn(camx + W/2);
  const col = z===0 ? '#e8ff8a' : z<3 ? '#9fe8ff' : '#ffb7d0';
  for(const f of luciernagas){
    const x = (((f.x - camx*1.15 + Math.sin(t*.6+f.ph)*14) % W) + W) % W;
    const y = z===3 ? ((f.y + t*14*f.v) % (GY-30)) : f.y + Math.sin(t*.9*f.v + f.ph)*10;
    const a = .4 + .6*Math.abs(Math.sin(t*1.7*f.v + f.ph));
    ctx.globalAlpha = a*.3; ctx.fillStyle = col; ctx.fillRect(Math.round(x)-2, Math.round(y)-2, 5, 5);
    ctx.globalAlpha = a; ctx.fillRect(Math.round(x), Math.round(y), z===3?2:1, z===3?2:1);
  }
  ctx.globalAlpha = 1;
}

/* ---- Decoración cerca del jugador (postes, antorchas, cartel) ---- */
function llama(x, y){
  const f = Math.sin(t*14 + x)*1.5;
  const r = 22 + Math.sin(t*9+x)*2;
  const g = ctx.createRadialGradient(x, y-5, 1, x, y-5, r);
  g.addColorStop(0,'rgba(255,190,90,.55)'); g.addColorStop(1,'rgba(255,190,90,0)');
  ctx.fillStyle = g; ctx.fillRect(x-r, y-5-r, r*2, r*2);
  ctx.fillStyle = '#ff7a2f'; ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+f,y-12); ctx.lineTo(x+4,y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd05a'; ctx.beginPath(); ctx.moveTo(x-2,y); ctx.lineTo(x+f*.6,y-8); ctx.lineTo(x+2,y); ctx.closePath(); ctx.fill();
}
function dibujarDecoracion(camx){
  // cartel de bienvenida
  if(camx < 140){
    const x = 78 - camx;
    R(x+7,GY-34,4,34,'#6a4a34'); R(x-8,GY-44,34,18,'#8a6a44'); R(x-8,GY-44,34,3,'#b58a5a'); R(x-8,GY-29,34,3,'#4f3624');
    R(x-2,GY-38,20,2,'#3f2a1e'); R(x-2,GY-33,14,2,'#3f2a1e');
    R(x+14,GY-40,6,2,'#e0b84a'); R(x+18,GY-42,2,6,'#e0b84a');
  }
  // postes con antorchas hacia el castillo
  for(let wx=3780; wx<4160; wx+=126){
    if(wx < camx-20 || wx > camx+W+20) continue;
    const x = wx - camx;
    R(x-2,GY-44,4,44,'#4a3a5e'); R(x-5,GY-48,10,5,'#7f74a0'); R(x-5,GY-48,10,2,'#b7acd8');
    llama(x, GY-50);
  }
}

/* ---- Castillo ---- */
function dibujarCastillo(camx){
  const x0 = 4130;
  if(x0+380 < camx || x0 > camx+W) return;
  const X = v => Math.round(v - camx);
  const piedra = '#7f73ab', claro = '#a196cc', oscuro = '#574c82', muy = '#3b3260';
  // muro de acceso
  R(X(4130), GY-72, 60, 72, piedra); R(X(4130), GY-72, 60, 3, claro);
  for(let k=0;k<5;k++) R(X(4130+k*13), GY-80, 8, 8, piedra);
  // cuerpo principal
  R(X(4230), GY-150, 180, 150, piedra); R(X(4230), GY-150, 180, 4, claro); R(X(4230), GY-150, 4, 150, claro); R(X(4406), GY-150, 4, 150, oscuro);
  for(let yy=GY-146; yy<GY; yy+=14) for(let xx=4234; xx<4406; xx+=24){ const off = (Math.floor((yy+146-GY)/14)%2)*12; R(X(xx+off), yy, 22, 1, oscuro); R(X(xx+off), yy, 1, 13, oscuro); }
  for(let k=0;k<8;k++) R(X(4230+k*24), GY-158, 14, 10, piedra);
  // torres
  const torre = (tx, alto, techo)=>{
    R(X(tx), GY-alto, 44, alto, claro); R(X(tx+4), GY-alto, 36, alto, piedra); R(X(tx+38), GY-alto, 6, alto, oscuro);
    for(let yy=GY-alto+8; yy<GY; yy+=14) R(X(tx+4), yy, 36, 1, oscuro);
    for(let k=0;k<3;k++) R(X(tx+k*16), GY-alto-8, 12, 10, claro);
    ctx.fillStyle = techo; ctx.beginPath(); ctx.moveTo(X(tx-5), GY-alto-8); ctx.lineTo(X(tx+22), GY-alto-52); ctx.lineTo(X(tx+49), GY-alto-8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(X(tx+22), GY-alto-52); ctx.lineTo(X(tx+49), GY-alto-8); ctx.lineTo(X(tx+22), GY-alto-8); ctx.closePath(); ctx.fill();
    // ventana con luz
    const parp = .75 + .25*Math.sin(t*3+tx);
    R(X(tx+16), GY-alto+26, 12, 20, muy); ctx.globalAlpha = parp; R(X(tx+18), GY-alto+28, 8, 16, '#ffe08a'); ctx.globalAlpha = 1; R(X(tx+21), GY-alto+28, 2, 16, muy);
    // pendón
    R(X(tx+20), GY-alto-52, 2, 12, '#e6dcc8');
    const ond = Math.sin(t*5+tx)*2;
    ctx.fillStyle = '#e0b84a'; ctx.beginPath(); ctx.moveTo(X(tx+22), GY-alto-52); ctx.lineTo(X(tx+38+ond), GY-alto-47); ctx.lineTo(X(tx+22), GY-alto-42); ctx.closePath(); ctx.fill();
  };
  torre(4186, 172, '#c84a78'); torre(4402, 172, '#c84a78');
  // torre central alta
  R(X(4296), GY-184, 48, 44, piedra); R(X(4296), GY-184, 48, 3, claro); R(X(4338), GY-184, 6, 44, oscuro);
  for(let k=0;k<3;k++) R(X(4296+k*18), GY-192, 12, 10, claro);
  ctx.fillStyle = '#3d5fd0'; ctx.beginPath(); ctx.moveTo(X(4290), GY-192); ctx.lineTo(X(4320), GY-232); ctx.lineTo(X(4350), GY-192); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.moveTo(X(4320), GY-232); ctx.lineTo(X(4350), GY-192); ctx.lineTo(X(4320), GY-192); ctx.closePath(); ctx.fill();
  R(X(4319), GY-246, 2, 14, '#e6dcc8'); const o2 = Math.sin(t*5)*2; ctx.fillStyle = '#ff7fa8'; ctx.beginPath(); ctx.moveTo(X(4321), GY-246); ctx.lineTo(X(4335+o2), GY-241); ctx.lineTo(X(4321), GY-236); ctx.closePath(); ctx.fill();
  R(X(4310), GY-172, 20, 26, muy); R(X(4312), GY-170, 16, 22, '#ffe08a'); R(X(4319), GY-170, 2, 22, muy);
  // ventanas del cuerpo
  for(const wx of [4250, 4272, 4368, 4388]){ R(X(wx), GY-118, 10, 18, muy); ctx.globalAlpha = .8; R(X(wx+2), GY-116, 6, 14, '#ffe08a'); ctx.globalAlpha = 1; }
  // arco de la puerta
  const gx = GATE_X;
  R(X(gx-24), GY-96, 48, 96, muy);
  ctx.fillStyle = muy; ctx.beginPath(); ctx.arc(X(gx), GY-96, 24, Math.PI, 0); ctx.fill();
  // interior cálido (visible al abrir)
  const ab = puertaAbierta ? ease(puertaT/1.4) : 0;
  if(ab > 0){
    const gg = ctx.createLinearGradient(0, GY-120, 0, GY);
    gg.addColorStop(0,'#ffd98a'); gg.addColorStop(1,'#ff9a5a');
    ctx.globalAlpha = ab; ctx.fillStyle = gg;
    ctx.beginPath(); ctx.moveTo(X(gx-19), GY); ctx.lineTo(X(gx-19), GY-96); ctx.arc(X(gx), GY-96, 19, Math.PI, 0); ctx.lineTo(X(gx+19), GY); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    R(X(gx-19), GY-96, 38, 96, '#150c2a'); ctx.fillStyle = '#150c2a'; ctx.beginPath(); ctx.arc(X(gx), GY-96, 19, Math.PI, 0); ctx.fill();
  }
  // rastrillo (reja) — sube al abrirse
  if(ab < .98){
    ctx.save(); ctx.beginPath(); ctx.rect(X(gx-19), GY-115, 38, 115); ctx.clip();
    const bottom = GY - 96*ab, top = GY - 130;
    for(let xx=gx-17; xx<gx+18; xx+=6) R(X(xx), top, 2, bottom-top, '#8b90a8');
    for(let yy=bottom-10; yy>top; yy-=16) R(X(gx-19), yy, 38, 2, '#6c7190');
    for(let xx=gx-17; xx<gx+18; xx+=6){ ctx.fillStyle='#c9cfe6'; ctx.beginPath(); ctx.moveTo(X(xx), bottom); ctx.lineTo(X(xx+1), bottom+6); ctx.lineTo(X(xx+2), bottom); ctx.fill(); }
    ctx.restore();
  }
  // marco de la puerta
  R(X(gx-24), GY-96, 5, 96, claro); R(X(gx+19), GY-96, 5, 96, oscuro);
  // antorchas a los lados
  for(const dx of [-44, 44]){ R(X(gx+dx)-2, GY-46, 4, 26, '#4a3a5e'); R(X(gx+dx)-5, GY-49, 10, 4, '#7f74a0'); llama(X(gx+dx), GY-52); }
  // luz de la puerta abierta sobre el suelo
  if(ab > 0){
    ctx.globalAlpha = ab*.4; const lg = ctx.createLinearGradient(X(gx),GY,X(gx-70),GY);
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.moveTo(X(gx-19),GY); ctx.lineTo(X(gx+19),GY); ctx.lineTo(X(gx-30),GY+8); ctx.lineTo(X(gx-100),GY+8); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
}

/* =====================================================================
   CONTROLES
   ===================================================================== */
const activa = () => pantallaMbl.classList.contains('activa');
document.addEventListener('keydown', (e)=>{
  if(!activa() || !corriendo) return;
  if(['ArrowLeft','a','A'].includes(e.key)) teclas.izq = true;
  if(['ArrowRight','d','D'].includes(e.key)) teclas.der = true;
  if(['ArrowUp','w','W',' '].includes(e.key)){ e.preventDefault(); if(estado==='escena') avanzarDialogo(); else saltar(); }
  if(['ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  if(['f','F','x','X','j','J'].includes(e.key)) atacar();
  if(e.key==='Enter') avanzarDialogo();
});
document.addEventListener('keyup', (e)=>{
  if(['ArrowLeft','a','A'].includes(e.key)) teclas.izq = false;
  if(['ArrowRight','d','D'].includes(e.key)) teclas.der = false;
});
function ligarBoton(id, on, off){
  const b = $(id);
  const down = e=>{ e.preventDefault(); audio(); on(); };
  const up   = e=>{ e.preventDefault(); if(off) off(); };
  b.addEventListener('touchstart', down, {passive:false});
  b.addEventListener('mousedown', down);
  if(off){
    b.addEventListener('touchend', up, {passive:false});
    b.addEventListener('touchcancel', up, {passive:false});
    b.addEventListener('mouseup', up);
    b.addEventListener('mouseleave', up);
  }
}
ligarBoton('mbl-izq', ()=>teclas.izq=true, ()=>teclas.izq=false);
ligarBoton('mbl-der', ()=>teclas.der=true, ()=>teclas.der=false);
ligarBoton('mbl-saltar', ()=>{ if(estado==='escena') avanzarDialogo(); else saltar(); });
ligarBoton('mbl-atacar', ()=>{ if(estado==='escena') avanzarDialogo(); else atacar(); });
$('mbl-viewport').addEventListener('click', avanzarDialogo);

$('btn-menu-mbl').addEventListener('click', ()=>{ corriendo = false; irAlMenu(pantallaMbl); });
$('btn-mbl-reintentar').addEventListener('click', ()=>{
  pantallaVict.classList.remove('visible');
  setTimeout(()=>{ pantallaVict.classList.remove('activa'); iniciarMBL(); }, 350);
});
$('btn-mbl-menu2').addEventListener('click', ()=>{
  pantallaVict.classList.remove('visible');
  setTimeout(()=>pantallaVict.classList.remove('activa'), 350);
  irAlMenuDirecto();
});

window.iniciarMBL = iniciarMBL;
})();
