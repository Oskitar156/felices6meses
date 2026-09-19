(function(){
const pantallaMenu  = document.getElementById("pantalla-menu");
const pantallaJuego = document.getElementById("pantalla-juego");
const pantallaFinal = document.getElementById("pantalla-final");

function mostrar(el){ el.classList.add("activa"); requestAnimationFrame(()=>el.classList.add("visible")); }
function ocultar(el){ el.classList.remove("visible"); setTimeout(()=>el.classList.remove("activa"), 400); }

window.irAlMenu = function(pantallaActual){
  ocultar(pantallaActual);
  setTimeout(()=>mostrar(pantallaMenu), 380);
};
window.irAlMenuDirecto = function(){ mostrar(pantallaMenu); };

document.getElementById("tarjeta-bee").addEventListener("click", ()=>{
  ocultar(pantallaMenu);
  setTimeout(()=>{ mostrar(pantallaJuego); window.iniciarBeeGame(); }, 380);
});
document.getElementById("tarjeta-mbl").addEventListener("click", ()=>{
  ocultar(pantallaMenu);
  setTimeout(()=>{ window.iniciarMBL(); }, 380);
});
document.getElementById("btn-volver-menu-bee").addEventListener("click", ()=>{
  irAlMenu(pantallaFinal);
});
})();
