/* =============================================
   CLOUDVIDEO — script.js
   ============================================= */

/* --------------------------------------------------
   ⚙️  CONFIGURACIÓN — EDITAR ESTOS DOS VALORES
   --------------------------------------------------
   API_KEY   → Tu clave de Google Cloud Console
   FOLDER_ID → El ID de tu carpeta en Google Drive
   -------------------------------------------------- */
const API_KEY   = 'AIzaSyDEid4OE0K8wXenn9LxOwvvjNi0uMtu8zE';
const FOLDER_ID = '1tSRXw35deTcH4yTeJQGrAK69rq0XojwY';

/* --------------------------------------------------
   🎬  TIPOS DE ARCHIVO DE VIDEO SOPORTADOS
   -------------------------------------------------- */
const TIPOS_VIDEO = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'ogv'];

/* --------------------------------------------------
   🔗  URL BASE DE LA API DE GOOGLE DRIVE
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

const elModal       = document.getElementById('modal-reproductor');
const elOverlay     = document.getElementById('modal-overlay');
const elCerrar      = document.getElementById('modal-cerrar');
const elModalTitulo = document.getElementById('modal-titulo');

/* --------------------------------------------------
   INSTANCIA DE PLYR
   Documentación: https://github.com/sampotts/plyr#options
   -------------------------------------------------- */
const reproductor = new Plyr('#reproductor', {
  controls: [
    'play-large',
    'play',
    'progress',
    'current-time',
    'duration',
    'mute',
    'volume',
    'settings',
    'pip',
    'fullscreen',
  ],
  settings: ['speed'],
  /* Velocidades de reproducción disponibles */
  speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
  keyboard: { focused: true, global: true },
  tooltips: { controls: true, seek: true },
  /* Forzamos calidad máxima: no permitimos degradar la resolución */
  quality: {
    default: 1080,
    options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240],
    forced: true,
    onChange: (quality) => {
      /* Si el usuario o el sistema intenta bajar de 1080p,
         lo revertimos a 1080 automáticamente */
      if (quality < 1080) {
        reproductor.quality = 1080;
      }
    },
  },
  i18n: {
    play:            'Reproducir',
    pause:           'Pausar',
    mute:            'Silenciar',
    unmute:          'Activar sonido',
    enterFullscreen: 'Pantalla completa',
    exitFullscreen:  'Salir de pantalla completa',
    settings:        'Configuración',
    speed:           'Velocidad',
    normal:          'Normal',
  },
});

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
    actualizarBarraEspacio(todasLasPeliculas);
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
   RENDERIZAR GRID
   ============================================= */
function renderizarGrid(peliculas) {
  elGrid.innerHTML = '';
  peliculas.forEach((pelicula, indice) => {
    elGrid.appendChild(crearTarjeta(pelicula, indice));
  });
}

/* =============================================
   CREAR TARJETA
   ============================================= */
function crearTarjeta(pelicula, indice) {
  const nombreLimpio = pelicula.name.replace(/\.[^/.]+$/, '');
  const tamano = pelicula.size ? formatearTamano(Number(pelicula.size)) : 'Video';

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
      <div class="poster-overlay">
        <p class="overlay-titulo">${nombreLimpio}</p>
        <p class="overlay-meta">${tamano}</p>
      </div>
      <div class="poster-play" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
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
   ABRIR REPRODUCTOR con Plyr
   Usamos la URL de descarga directa de Drive.
   ============================================= */
function abrirReproductor(fileId, titulo) {
  /* URL de streaming directo de Google Drive */
  const urlVideo = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;

  elModalTitulo.textContent = titulo;

  reproductor.source = {
    type: 'video',
    sources: [{ src: urlVideo, type: 'video/mp4' }],
  };

  elModal.classList.remove('oculto');
  document.body.style.overflow = 'hidden';
}

/* =============================================
   CERRAR REPRODUCTOR
   ============================================= */
function cerrarReproductor() {
  reproductor.pause();
  elModal.classList.add('oculto');
  document.body.style.overflow = '';
}

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
   MOSTRAR ESTADO
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
   BARRA DE ESPACIO DISPONIBLE
   Calcula el peso total de los videos de la carpeta
   sobre los 15 GB totales de Google Drive gratuito.
   ============================================= */
function actualizarBarraEspacio(peliculas) {
  /* Límite total de Google Drive gratuito en bytes */
  const TOTAL_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB

  /* Sumamos el tamaño de todos los videos */
  const usadoBytes = peliculas.reduce((acc, p) => acc + (Number(p.size) || 0), 0);

  /* Porcentaje ocupado (máximo 100%) */
  const porcentaje = Math.min((usadoBytes / TOTAL_BYTES) * 100, 100);

  /* Textos legibles */
  const usadoTexto    = formatearTamano(usadoBytes);
  const disponible    = formatearTamano(Math.max(TOTAL_BYTES - usadoBytes, 0));

  /* Actualizamos el DOM */
  const barraProgreso = document.getElementById('espacio-usado');
  const textoUsado    = document.getElementById('espacio-usado-texto');
  const textoDetalle  = document.getElementById('espacio-detalle');

  barraProgreso.style.width = `${porcentaje}%`;
  textoUsado.textContent    = usadoTexto;
  textoDetalle.textContent  = `${disponible} disponibles de 15 GB`;
}

/* =============================================
   FORMATEAR TAMAÑO
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
