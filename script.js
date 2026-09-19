/* =========================================================
   LABERINTO DE NUESTROS RECUERDOS — versión pixel art
   Solo HTML + CSS + JavaScript. Sin librerías.
   ========================================================= */

/* ---------------------------------------------------------
   1. CONTENIDO DE LAS 6 CARTAS  ← EDITA SOLO ESTO
   ---------------------------------------------------------
     titulo  : título del recuerdo
     fecha   : opcional (si queda vacío no se muestra)
     mensaje : el texto del recuerdo (respeta los saltos de línea)
     frase   : opcional, frase romántica final
     imagen  : opcional, ruta relativa, ej: "images/recuerdo1.jpg"
   --------------------------------------------------------- */
const cartas = [
  { titulo: "Nuestra primera foto", fecha: "", mensaje: "Esta fue una de las primeras fotos que nos tomamos, y me encanta porque en ella apareces tú: la persona que ilumina mis días.\n\nDesde entonces tu sonrisa se volvió mi lugar favorito del mundo y la razón por la que cada mañana empieza con ilusión. Gracias por llegar a mi vida y llenarla de tanta luz.", frase: "Tú eres mi luz ♥", imagen: "images/recuerdo1.jpg" },
  { titulo: "Hecho con tus manos", fecha: "", mensaje: "Cada una de las cosas que haces para mí, ya sean dibujos o manualidades, las aprecio con toda mi alma, y me encanta que lo hagas.\n\nNo son solo trazos ni materiales: son pedacitos de tu cariño y de tu talento que guardo con muchísimo amor. Gracias por regalarme tanto de ti.", frase: "Tu arte es mi tesoro ♥", imagen: "images/recuerdo2.jpg" },
  { titulo: "Cuando ya había confianza", fecha: "", mensaje: "Esta imagen es de cuando ya nos teníamos mucha más confianza, y me hace el hombre más feliz del mundo. Estar así contigo, tan tranquilos y tan nosotros, es mi lugar seguro.\n\nSiempre estaré dispuesto a ayudarte en cualquier situación, así como tú estás para mí.", frase: "Somos un equipo ♥", imagen: "images/recuerdo3.jpg" },
  { titulo: "Seguimos juntos", fecha: "", mensaje: "A pesar de las cosas que hemos pasado, seguimos juntos, porque nos amamos infinitamente, y me siento muy feliz de que sea así.\n\nSabes que tú eres mi mundo entero y quisiera pasar toda la vida contigo, si tú me lo permites y quieres quedarte con el bebé :,3", frase: "Contigo, para siempre ♥", imagen: "images/recuerdo4.jpg" },
  { titulo: "Todo por verte feliz", fecha: "", mensaje: "Yo siempre haría todo por verte feliz y cumplir cada uno de tus deseos.\n\nA lo largo de este tiempo que nos hemos conocido y compartido tantas de nuestras cosas, he sentido una conexión muy bonita contigo, una que hace que haga cualquier cosa por ti.\n\nTú eres mi mundo entero y te amo con todo mi corazón.", frase: "Te amo con todo mi corazón ♥", imagen: "images/recuerdo5.jpg" },
  { titulo: "Lo que aún nos falta", fecha: "", mensaje: "Espero con ilusión las muchas otras historias que nos quedan por vivir, hasta que este juego llamado vida nos permita estar juntos.\n\nPor mi parte, siempre tendrás un lugar muy especial en mi corazón y en mi mente.", frase: "Siempre tuyo ♥", imagen: "" }
];

const TEXTO_PENDIENTE = "Este recuerdo todavía está por escribirse.";

/* ---------------------------------------------------------
   2. MAPA
   ---------------------------------------------------------
   Medidas internas fijas: 21 x 15 bloques de 40 px = 840 x 600.
   La pantalla solo escala; las colisiones nunca se desajustan.
   '#' = bloque (pared)     '.' = camino
   --------------------------------------------------------- */
const CELDA = 40;

const MAPA = [
  "#####################",
  "#...................#",
  "#.###.#####.#####.#.#",
  "#.#...#...#.....#.#.#",
  "#.#.###.#.#####.#.#.#",
  "#...#...#.....#.#...#",
  "###.#.#######.#.###.#",
  "#...#.......#.#...#.#",
  "#.#####.###.#.###.#.#",
  "#.....#.#...#...#...#",
  "#####.#.#.#####.###.#",
  "#.....#.#.....#.....#",
  "#.#####.#####.#####.#",
  "#...................#",
  "#####################"
];

const COLS = MAPA[0].length;
const FILAS = MAPA.length;
const ANCHO_MAPA = COLS * CELDA;
const ALTO_MAPA  = FILAS * CELDA;

/* Salida e inicio */
const INICIO = { col: 1,  fila: 13 };   // esquina inferior izquierda
const SALIDA = { col: 19, fila: 1  };   // esquina superior derecha

/* Posiciones de las 6 cartas (cada una en una zona distinta) */
const POSICIONES_CARTAS = [
  { col: 3,  fila: 3  },
  { col: 17, fila: 3  },
  { col: 9,  fila: 5  },
  { col: 3,  fila: 9  },
  { col: 17, fila: 9  },
  { col: 11, fila: 11 }
];

const TAM_PERSONAJE = 30;   // caja de colisión
const VELOCIDAD = 180;      // px internos por segundo

/* ---------------------------------------------------------
   3. SPRITE DEL PERSONAJE
   ---------------------------------------------------------
   Se usa "images/personaje-pixel.png".
   Si el archivo no se encuentra (por ejemplo al mover la carpeta),
   se carga automáticamente la copia de respaldo incluida aquí,
   así el personaje SIEMPRE se ve.
   --------------------------------------------------------- */
const SPRITE_RESPALDO = "data:image/png;base64,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";

/* ---------------------------------------------------------
   4. DOM
   --------------------------------------------------------- */
const pantallaInicio = document.getElementById("pantalla-inicio");
const pantallaJuego  = document.getElementById("pantalla-juego");
const pantallaFinal  = document.getElementById("pantalla-final");

const escenario   = document.getElementById("escenario");
const tablero     = document.getElementById("tablero");
const capaParedes = document.getElementById("capa-paredes");
const capaCartas  = document.getElementById("capa-cartas");
const salidaEl    = document.getElementById("salida");
const personaje   = document.getElementById("personaje");

const contador   = document.getElementById("contador");
const hudObjetivo= document.getElementById("hud-objetivo");
const aviso      = document.getElementById("aviso");
const dpad       = document.getElementById("dpad");

const btnStart     = document.getElementById("btn-start");
const btnCerrar    = document.getElementById("btn-cerrar-carta");
const btnReiniciar = document.getElementById("btn-reiniciar");

const modal        = document.getElementById("modal-carta");
const cartaTitulo  = document.getElementById("carta-titulo");
const cartaFecha   = document.getElementById("carta-fecha");
const cartaMensaje = document.getElementById("carta-mensaje");
const cartaFrase   = document.getElementById("carta-frase");
const cartaImagen  = document.getElementById("carta-imagen");

const capaParticulas = document.getElementById("capa-particulas");
const capaConfeti    = document.getElementById("confeti");

/* Respaldo del sprite */
personaje.addEventListener("error", () => { personaje.src = SPRITE_RESPALDO; });
if (personaje.complete && personaje.naturalWidth === 0) personaje.src = SPRITE_RESPALDO;

/* ---------------------------------------------------------
   5. ESTADO
   --------------------------------------------------------- */
const jugador = { x: 0, y: 0 };
const teclas  = { arriba:false, abajo:false, izquierda:false, derecha:false };

let elementosCartas = [];
let encontradas = 0;
let salidaAbierta = false;
let jugando = false;
let pausado = false;
let ultimoTiempo = 0;
let escala = 1;

/* ---------------------------------------------------------
   6. CONSTRUCCIÓN DEL LABERINTO
   --------------------------------------------------------- */
function esPared(col, fila){
  if (col < 0 || fila < 0 || col >= COLS || fila >= FILAS) return true;
  return MAPA[fila][col] === "#";
}

function dibujarParedes(){
  capaParedes.innerHTML = "";
  for (let f = 0; f < FILAS; f++){
    for (let c = 0; c < COLS; c++){
      if (MAPA[f][c] !== "#") continue;
      const b = document.createElement("div");
      // variantes de textura para que los bloques no se vean repetidos
      const v = (c * 7 + f * 3) % 3;
      b.className = "bloque" + (v === 1 ? " v2" : v === 2 ? " v3" : "");
      if ((c * 5 + f * 11) % 17 === 0) b.classList.add("corazon");
      b.style.left = c * CELDA + "px";
      b.style.top  = f * CELDA + "px";
      capaParedes.appendChild(b);
    }
  }
}

function dibujarCartas(){
  capaCartas.innerHTML = "";
  elementosCartas = POSICIONES_CARTAS.map((pos, i) => {
    const div = document.createElement("div");
    div.className = "carta";
    div.style.left = pos.col * CELDA + (CELDA - 26) / 2 + "px";
    div.style.top  = pos.fila * CELDA + (CELDA - 20) / 2 + "px";
    div.style.animationDelay = (i * 0.12) + "s";
    capaCartas.appendChild(div);
    return { div, pos, recogida:false, indice:i };
  });
}

function colocarSalida(){
  salidaEl.style.left = SALIDA.col * CELDA + "px";
  salidaEl.style.top  = SALIDA.fila * CELDA + "px";
  salidaEl.className = "salida bloqueada";
  salidaEl.querySelector(".salida-icono").textContent = "🔒";
  salidaAbierta = false;
}

function abrirSalida(){
  salidaAbierta = true;
  salidaEl.className = "salida abierta";
  salidaEl.querySelector(".salida-icono").textContent = "♥";
  hudObjetivo.textContent = "¡La salida se abrió! Ve a la puerta ♥";
  hudObjetivo.classList.add("listo");
  mostrarAviso("LA SALIDA SE ABRIÓ<br>Búscala en la esquina superior derecha");
  sonido("salida");
}

function mostrarAviso(html){
  aviso.innerHTML = html;
  aviso.classList.add("visible");
  clearTimeout(mostrarAviso.t);
  mostrarAviso.t = setTimeout(() => aviso.classList.remove("visible"), 3800);
}

/* ---------------------------------------------------------
   7. ESCALADO RESPONSIVE
   --------------------------------------------------------- */
function ajustarEscala(){
  tablero.style.width  = ANCHO_MAPA + "px";
  tablero.style.height = ALTO_MAPA + "px";

  const hud = document.getElementById("hud");
  const alturaHud = hud ? hud.offsetHeight : 0;
  const dpadVisible = getComputedStyle(dpad).display !== "none";
  const horizontal = window.innerHeight <= 480 && window.innerWidth > window.innerHeight;

  let anchoDisp = window.innerWidth - 24;
  let altoDisp  = window.innerHeight - alturaHud - 46;

  if (dpadVisible){
    if (horizontal) anchoDisp -= dpad.offsetWidth + 20;
    else            altoDisp  -= dpad.offsetHeight + 18;
  }

  escala = Math.max(0.22, Math.min(anchoDisp / ANCHO_MAPA, altoDisp / ALTO_MAPA));

  tablero.style.transform = "scale(" + escala + ")";
  escenario.style.width  = ANCHO_MAPA * escala + "px";
  escenario.style.height = ALTO_MAPA * escala + "px";
}

/* ---------------------------------------------------------
   8. PERSONAJE Y COLISIONES
   --------------------------------------------------------- */
function colocarPersonaje(){
  jugador.x = INICIO.col * CELDA + (CELDA - TAM_PERSONAJE) / 2;
  jugador.y = INICIO.fila * CELDA + (CELDA - TAM_PERSONAJE) / 2;
  personaje.style.scale = "1 1";
  actualizarSprite();
}

function actualizarSprite(){
  const desfase = (40 - TAM_PERSONAJE) / 2;   // el sprite mide 40 px
  personaje.style.left = (jugador.x - desfase) + "px";
  personaje.style.top  = (jugador.y - desfase) + "px";
}

function posicionLibre(x, y){
  const m = 1.2;
  const c1 = Math.floor((x + m) / CELDA), c2 = Math.floor((x + TAM_PERSONAJE - m) / CELDA);
  const f1 = Math.floor((y + m) / CELDA), f2 = Math.floor((y + TAM_PERSONAJE - m) / CELDA);
  for (let f = f1; f <= f2; f++)
    for (let c = c1; c <= c2; c++)
      if (esPared(c, f)) return false;
  return true;
}

function mover(delta){
  let dx = 0, dy = 0;
  if (teclas.izquierda) dx -= 1;
  if (teclas.derecha)   dx += 1;
  if (teclas.arriba)    dy -= 1;
  if (teclas.abajo)     dy += 1;
  if (dx === 0 && dy === 0) return;
  if (dx !== 0 && dy !== 0){ const k = Math.SQRT1_2; dx *= k; dy *= k; }

  const paso = VELOCIDAD * delta;

  const nx = jugador.x + dx * paso;
  if (posicionLibre(nx, jugador.y)) jugador.x = nx;

  const ny = jugador.y + dy * paso;
  if (posicionLibre(jugador.x, ny)) jugador.y = ny;

  if (dx < -0.01) personaje.style.scale = "-1 1";
  else if (dx > 0.01) personaje.style.scale = "1 1";

  actualizarSprite();
}

/* ---------------------------------------------------------
   9. BUCLE
   --------------------------------------------------------- */
function bucle(tiempo){
  if (!jugando) return;
  if (!ultimoTiempo) ultimoTiempo = tiempo;
  const delta = Math.min((tiempo - ultimoTiempo) / 1000, 0.05);
  ultimoTiempo = tiempo;

  if (!pausado){
    mover(delta);
    revisarCartas();
    revisarSalida();
  }
  requestAnimationFrame(bucle);
}

function centroJugador(){
  return { x: jugador.x + TAM_PERSONAJE / 2, y: jugador.y + TAM_PERSONAJE / 2 };
}

/* ---------------------------------------------------------
   10. CARTAS
   --------------------------------------------------------- */
function revisarCartas(){
  const c = centroJugador();
  for (const carta of elementosCartas){
    if (carta.recogida) continue;
    const px = carta.pos.col * CELDA + CELDA / 2;
    const py = carta.pos.fila * CELDA + CELDA / 2;
    if (Math.hypot(c.x - px, c.y - py) < 24){ recogerCarta(carta); break; }
  }
}

function recogerCarta(carta){
  carta.recogida = true;
  carta.div.classList.add("recogida");
  chispas(carta.pos.col * CELDA + CELDA / 2, carta.pos.fila * CELDA + CELDA / 2);
  sonido("recoger");

  encontradas++;
  contador.textContent = encontradas + " / 6";
  contador.classList.remove("suma");
  void contador.offsetWidth;
  contador.classList.add("suma");

  setTimeout(() => abrirCarta(carta.indice), 380);
}

function chispas(x, y){
  const simbolos = ["♥", "+", "*", "♦"];
  for (let i = 0; i < 10; i++){
    const s = document.createElement("div");
    s.className = "chispa";
    s.textContent = simbolos[i % simbolos.length];
    s.style.left = x + "px";
    s.style.top  = y + "px";
    const ang = (Math.PI * 2 * i) / 10;
    s.style.setProperty("--dx", Math.round(Math.cos(ang) * 50) + "px");
    s.style.setProperty("--dy", Math.round(Math.sin(ang) * 50) + "px");
    capaCartas.appendChild(s);
    setTimeout(() => s.remove(), 750);
  }
}

/* ---------------------------------------------------------
   11. MODAL
   --------------------------------------------------------- */
function abrirCarta(indice){
  const datos = cartas[indice] || {};
  pausado = true;
  soltarTeclas();

  cartaTitulo.textContent  = datos.titulo || ("Recuerdo " + (indice + 1));
  cartaFecha.textContent   = datos.fecha || "";
  cartaMensaje.textContent = datos.mensaje ? datos.mensaje : TEXTO_PENDIENTE;
  cartaFrase.textContent   = datos.frase || "";

  if (datos.imagen){
    cartaImagen.src = datos.imagen;
    cartaImagen.classList.add("mostrar");
  } else {
    cartaImagen.classList.remove("mostrar");
    cartaImagen.removeAttribute("src");
  }

  modal.classList.add("activa");
  requestAnimationFrame(() => modal.classList.add("visible"));
  sonido("abrir");
  btnCerrar.focus();
}

function cerrarCarta(){
  modal.classList.remove("visible");
  setTimeout(() => {
    modal.classList.remove("activa");
    pausado = false;
    if (encontradas >= 6 && !salidaAbierta) abrirSalida();
  }, 260);
}

/* ---------------------------------------------------------
   12. SALIDA Y FINAL
   --------------------------------------------------------- */
function revisarSalida(){
  const c = centroJugador();
  const px = SALIDA.col * CELDA + CELDA / 2;
  const py = SALIDA.fila * CELDA + CELDA / 2;
  const cerca = Math.hypot(c.x - px, c.y - py) < 24;
  if (!cerca) return;

  if (salidaAbierta) mostrarFinal();
  else if (!revisarSalida.aviso){
    revisarSalida.aviso = true;
    mostrarAviso("LA PUERTA ESTÁ CERRADA<br>Faltan " + (6 - encontradas) + " recuerdos");
    setTimeout(() => { revisarSalida.aviso = false; }, 4200);
  }
}

/* ---------------------------------------------------------
   13. PANTALLAS
   --------------------------------------------------------- */
function mostrarPantalla(el){
  el.classList.add("activa");
  requestAnimationFrame(() => el.classList.add("visible"));
}
function ocultarPantalla(el){
  el.classList.remove("visible");
  setTimeout(() => el.classList.remove("activa"), 500);
}

function iniciarJuego(){
  dibujarParedes();
  dibujarCartas();
  colocarSalida();
  colocarPersonaje();

  encontradas = 0;
  contador.textContent = "0 / 6";
  hudObjetivo.textContent = "Encuentra nuestros 6 recuerdos";
  hudObjetivo.classList.remove("listo");

  ocultarPantalla(pantallaInicio);
  mostrarPantalla(pantallaJuego);
  ajustarEscala();

  jugando = true;
  pausado = false;
  ultimoTiempo = 0;
  requestAnimationFrame(bucle);
  sonido("inicio");
}

function mostrarFinal(){
  jugando = false;
  soltarTeclas();
  aviso.classList.remove("visible");
  ocultarPantalla(pantallaJuego);
  mostrarPantalla(pantallaFinal);
  lanzarConfeti();
  sonido("final");
}

function reiniciar(){
  ocultarPantalla(pantallaFinal);
  capaConfeti.innerHTML = "";
  setTimeout(iniciarJuego, 400);
}

/* ---------------------------------------------------------
   14. CONTROLES
   --------------------------------------------------------- */
const TECLAS_MAPA = {
  ArrowUp:"arriba", w:"arriba", W:"arriba",
  ArrowDown:"abajo", s:"abajo", S:"abajo",
  ArrowLeft:"izquierda", a:"izquierda", A:"izquierda",
  ArrowRight:"derecha", d:"derecha", D:"derecha"
};

document.addEventListener("keydown", (e) => {
  const dir = TECLAS_MAPA[e.key];
  if (dir){ e.preventDefault(); teclas[dir] = true; }
  if (e.key === "Escape" && modal.classList.contains("activa")) cerrarCarta();
  if (e.key === "Enter" && !jugando && pantallaInicio.classList.contains("activa")) iniciarJuego();
}, { passive:false });

document.addEventListener("keyup", (e) => {
  const dir = TECLAS_MAPA[e.key];
  if (dir) teclas[dir] = false;
});

function soltarTeclas(){
  for (const k in teclas) teclas[k] = false;
  dpad.querySelectorAll(".dpad-btn").forEach(b => b.classList.remove("presionado"));
}

dpad.querySelectorAll(".dpad-btn").forEach(boton => {
  const dir = boton.dataset.dir;
  const presionar = (e) => { e.preventDefault(); teclas[dir] = true;  boton.classList.add("presionado"); };
  const soltar    = (e) => { e.preventDefault(); teclas[dir] = false; boton.classList.remove("presionado"); };
  boton.addEventListener("touchstart", presionar, { passive:false });
  boton.addEventListener("touchend", soltar, { passive:false });
  boton.addEventListener("touchcancel", soltar, { passive:false });
  boton.addEventListener("mousedown", presionar);
  boton.addEventListener("mouseup", soltar);
  boton.addEventListener("mouseleave", soltar);
  boton.addEventListener("contextmenu", e => e.preventDefault());
});

/* Mostrar u ocultar los botones de flechas */
const btnControles = document.getElementById("btn-controles");
btnControles.addEventListener("click", () => {
  dpad.classList.toggle("oculto");
  soltarTeclas();
  ajustarEscala();
});

window.addEventListener("blur", soltarTeclas);

if (btnStart) btnStart.addEventListener("click", iniciarJuego);
btnCerrar.addEventListener("click", cerrarCarta);
btnReiniciar.addEventListener("click", reiniciar);
modal.addEventListener("click", (e) => { if (e.target === modal) cerrarCarta(); });

window.addEventListener("resize", ajustarEscala);
window.addEventListener("orientationchange", () => setTimeout(ajustarEscala, 250));

/* ---------------------------------------------------------
   15. PARTÍCULAS Y CONFETI
   --------------------------------------------------------- */
const SIMBOLOS = ["♥", "♡", "✦", "+", "♦"];

function crearParticula(){
  const activa = pantallaInicio.classList.contains("activa") ||
                 pantallaFinal.classList.contains("activa");
  if (!activa || document.hidden) return;

  const p = document.createElement("div");
  p.className = "particula";
  p.textContent = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
  p.style.left = Math.random() * 100 + "vw";
  p.style.fontSize = (8 + Math.floor(Math.random() * 3) * 4) + "px";
  const dur = 8 + Math.random() * 6;
  p.style.animationDuration = dur + "s";
  capaParticulas.appendChild(p);
  setTimeout(() => p.remove(), dur * 1000);
}
setInterval(crearParticula, 520);

function lanzarConfeti(){
  const colores = ["#ff7fa8", "#ffd05a", "#fff3e6", "#ff4f86", "#8fe08a", "#6ad0ff"];
  for (let i = 0; i < 80; i++){
    const c = document.createElement("div");
    c.className = "confeti-pieza";
    c.style.left = Math.random() * 100 + "%";
    c.style.background = colores[Math.floor(Math.random() * colores.length)];
    const t = 6 + Math.floor(Math.random() * 3) * 4;
    c.style.width = t + "px";
    c.style.height = t + "px";
    c.style.animationDuration = (3 + Math.random() * 3) + "s";
    c.style.animationDelay = (Math.random() * 2.2) + "s";
    capaConfeti.appendChild(c);
  }
}

/* ---------------------------------------------------------
   16. SONIDO (generado, sin archivos externos)
   --------------------------------------------------------- */
let audioCtx = null;

function nota(frec, tiempo, dur, vol){
  const osc = audioCtx.createOscillator();
  const gan = audioCtx.createGain();
  osc.type = "square";                 // onda cuadrada: sonido retro
  osc.frequency.value = frec;
  gan.gain.setValueAtTime(0, audioCtx.currentTime + tiempo);
  gan.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + tiempo + 0.01);
  gan.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + tiempo + dur);
  osc.connect(gan).connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + tiempo);
  osc.stop(audioCtx.currentTime + tiempo + dur + 0.05);
}

function sonido(tipo){
  try{
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (tipo === "recoger")     [880, 1174].forEach((f,i) => nota(f, i*0.06, 0.12, 0.05));
    else if (tipo === "abrir")  [659, 784].forEach((f,i) => nota(f, i*0.07, 0.14, 0.04));
    else if (tipo === "inicio") [523, 659, 784].forEach((f,i) => nota(f, i*0.09, 0.14, 0.05));
    else if (tipo === "salida") [784, 988, 1174, 1568].forEach((f,i) => nota(f, i*0.09, 0.18, 0.05));
    else if (tipo === "final")  [523, 659, 784, 1046, 1318, 1568].forEach((f,i) => nota(f, i*0.15, 0.4, 0.05));
  } catch(e){ /* si el navegador bloquea el audio, el juego sigue igual */ }
}

/* ---------------------------------------------------------
   17. ARRANQUE
   --------------------------------------------------------- */
dibujarParedes();
dibujarCartas();
colocarSalida();
colocarPersonaje();
ajustarEscala();
window.iniciarBeeGame = iniciarJuego;
