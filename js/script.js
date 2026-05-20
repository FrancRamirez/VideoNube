/* =============================================
   CLOUDVIDEO — script.js
   Conecta con Google Drive API v3 para listar
   los archivos de la carpeta "Peliculas" y
   renderiza las tarjetas dinámicamente.
   ============================================= */

/* --------------------------------------------------
   ⚙️  CONFIGURACIÓN — EDITAR ESTOS DOS VALORES
   --------------------------------------------------
   API_KEY   → Tu clave de Google Cloud Console
               (APIs & Services → Credentials)
   FOLDER_ID → El ID de tu carpeta "Peliculas"
               en Google Drive (los caracteres
               después de /folders/ en la URL)
   -------------------------------------------------- */
const API_KEY   = 'AIzaSyDEid4OE0K8wXenn9LxOwvvjNi0uMtu8zE';
const FOLDER_ID = '1tSRXw35deTcH4yTeJQGrAK69rq0XojwY';

/* --------------------------------------------------
   🎬  TIPOS DE ARCHIVO DE VIDEO SOPORTADOS
   Si quieres agregar más extensiones, añádelas aquí.
   -------------------------------------------------- */
const TIPOS_VIDEO = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'ogv'];

/* --------------------------------------------------
   🔗  URL BASE DE LA API DE GOOGLE DRIVE
   No es necesario cambiar esto.
   -------------------------------------------------- */
const API_BASE = 'https://www.googleapis.com/drive/v3/files';

/* --------------------------------------------------
   REFERENCIAS AL DOM
   -------------------------------------------------- */
const elCargando    = document.getElementById('estado-cargando');
const elVacio       = document.getElementById('estado-vacio');
const elError       = document.getElementById('estado-error');
const elTextoError  = document.getElementById('texto-error');
const elColeccion   = document.getElementById('coleccion');
const elGrid        = document.getElementById('grid-peliculas');
const elBuscador    = document.getElementById('buscador');

const elModal       = document.getElementById('modal-reproductor');
const elOverlay     = document.getElementById('modal-overlay');
const elCerrar      = document.getElementById('modal-cerrar');
const elModalTitulo = document.getElementById('modal-titulo');
const elIframe      = document.getElementById('reproductor-iframe');

/* --------------------------------------------------
   VARIABLES DE ESTADO
   -------------------------------------------------- */
let todasLasPeliculas = [];

/* =============================================
   FUNCIÓN PRINCIPAL: cargar archivos de Drive
   ============================================= */
async function cargarPeliculas() {
  mostrarEstado('cargando');

  try {
    /* Pedimos también thumbnailLink para la previa del video.
       Drive genera thumbnails automáticamente para videos. */
    const campos   = 'files(id,name,mimeType,size,thumbnailLink)';
    const consulta = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed = false`);
    const url      = `${API_BASE}?q=${consulta}&fields=${campos}&pageSize=100&key=${API_KEY}`;

    const respuesta = await fetch(url);

    if (!respuesta.ok) {
      const datos = await respuesta.json();
      const msg   = datos?.error?.message || `Error HTTP ${respuesta.status}`;
      throw new Error(msg);
    }

    const datos    = await respuesta.json();
    const archivos = datos.files || [];

    todasLasPeliculas = archivos.filter(archivo => esVideo(archivo));

    if (todasLasPeliculas.length === 0) {
      mostrarEstado('vacio');
      return;
    }

    renderizarGrid(todasLasPeliculas);
    mostrarEstado('coleccion');

  } catch (error) {
    console.error('[CloudVideo] Error al cargar Drive:', error);
    elTextoError.textContent = `Error al cargar: ${error.message}`;
    mostrarEstado('error');
  }
}

/* =============================================
   ¿Es un archivo de video?
   ============================================= */
function esVideo(archivo) {
  if (archivo.mimeType && archivo.mimeType.startsWith('video/')) return true;
  const extension = archivo.name.split('.').pop().toLowerCase();
  return TIPOS_VIDEO.includes(extension);
}

/* =============================================
   RENDERIZAR GRID de tarjetas
   ============================================= */
function renderizarGrid(peliculas) {
  elGrid.innerHTML = '';
  peliculas.forEach((pelicula, indice) => {
    const tarjeta = crearTarjeta(pelicula, indice);
    elGrid.appendChild(tarjeta);
  });
}

/* =============================================
   CREAR una tarjeta de película
   ============================================= */
function crearTarjeta(pelicula, indice) {
  const nombreLimpio = pelicula.name.replace(/\.[^/.]+$/, '');
  const tamano = pelicula.size ? formatearTamano(Number(pelicula.size)) : 'Video';

  /* Thumbnail: Drive genera previews automáticamente.
     Pedimos la versión grande (s800) en lugar de la pequeña (s220).
     Si no existe, mostramos el ícono como fallback. */
  const tieneThumbnail = !!pelicula.thumbnailLink;
  const thumbUrl = tieneThumbnail
    ? pelicula.thumbnailLink.replace('=s220', '=s800')
    : null;

  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta';
  tarjeta.style.animationDelay = `${indice * 0.06}s`;
  tarjeta.setAttribute('role', 'button');
  tarjeta.setAttribute('tabindex', '0');
  tarjeta.setAttribute('aria-label', `Reproducir ${nombreLimpio}`);

  tarjeta.innerHTML = `
    <div class="tarjeta-poster">

      ${tieneThumbnail
        ? `<img class="poster-thumb" src="${thumbUrl}" alt="${nombreLimpio}" loading="lazy" />`
        : `<svg class="poster-icono" xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
              aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <line x1="7" y1="2" x2="7" y2="22"/>
              <line x1="17" y1="2" x2="17" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <line x1="2" y1="7" x2="7" y2="7"/>
              <line x1="2" y1="17" x2="7" y2="17"/>
              <line x1="17" y1="7" x2="22" y2="7"/>
              <line x1="17" y1="17" x2="22" y2="17"/>
            </svg>
            <span class="poster-tipo">Video</span>`
      }

      <!-- Overlay con título completo y peso, superpuesto en la imagen -->
      <div class="poster-overlay">
        <p class="overlay-titulo">${nombreLimpio}</p>
        <p class="overlay-meta">${tamano}</p>
      </div>

      <!-- Botón play visible al hacer hover -->
      <div class="poster-play" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="currentColor" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>

    </div>
  `;

  tarjeta.addEventListener('click', () => abrirReproductor(pelicula.id, nombreLimpio));
  tarjeta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirReproductor(pelicula.id, nombreLimpio);
    }
  });

  return tarjeta;
}

/* =============================================
   ABRIR REPRODUCTOR
   Usa el visor embebido de Google Drive via iframe.
   Compatible con MP4, MKV, AVI, MOV, WebM y más.
   ============================================= */
function abrirReproductor(fileId, titulo) {
  const urlEmbed = `https://drive.google.com/file/d/${fileId}/preview`;
  elModalTitulo.textContent = titulo;
  elIframe.src = urlEmbed;
  elModal.classList.remove('oculto');
  document.body.style.overflow = 'hidden';
}

/* =============================================
   CERRAR REPRODUCTOR
   ============================================= */
function cerrarReproductor() {
  elIframe.src = '';
  elModal.classList.add('oculto');
  document.body.style.overflow = '';
}

/* =============================================
   BÚSQUEDA EN TIEMPO REAL
   ============================================= */
elBuscador.addEventListener('input', () => {
  const termino = elBuscador.value.trim().toLowerCase();

  if (termino === '') {
    renderizarGrid(todasLasPeliculas);
    return;
  }

  const filtradas = todasLasPeliculas.filter(p =>
    p.name.toLowerCase().includes(termino)
  );

  renderizarGrid(filtradas);

  if (filtradas.length === 0) {
    elGrid.innerHTML = `
      <p style="color: var(--texto-suave); font-size: 20px; padding: 2rem 0;">
        No se encontraron películas con "<strong>${termino}</strong>".
      </p>
    `;
  }
});

/* =============================================
   EVENTOS DEL MODAL
   ============================================= */
elCerrar.addEventListener('click', cerrarReproductor);
elOverlay.addEventListener('click', cerrarReproductor);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !elModal.classList.contains('oculto')) {
    cerrarReproductor();
  }
});

/* =============================================
   FUNCIÓN: Mostrar estado de la interfaz
   ============================================= */
function mostrarEstado(estado) {
  elCargando.classList.add('oculto');
  elVacio.classList.add('oculto');
  elError.classList.add('oculto');
  elColeccion.classList.add('oculto');

  switch (estado) {
    case 'cargando':  elCargando.classList.remove('oculto');  break;
    case 'vacio':     elVacio.classList.remove('oculto');     break;
    case 'error':     elError.classList.remove('oculto');     break;
    case 'coleccion': elColeccion.classList.remove('oculto'); break;
  }
}

/* =============================================
   FUNCIÓN: Formatear tamaño de archivo
   ============================================= */
function formatearTamano(bytes) {
  if (bytes < 1024)               return `${bytes} B`;
  if (bytes < 1024 * 1024)        return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/* =============================================
   INICIO
   ============================================= */
document.addEventListener('DOMContentLoaded', cargarPeliculas);
