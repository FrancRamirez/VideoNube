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
const elCargando   = document.getElementById('estado-cargando');
const elVacio      = document.getElementById('estado-vacio');
const elError      = document.getElementById('estado-error');
const elTextoError = document.getElementById('texto-error');
const elColeccion  = document.getElementById('coleccion');
const elGrid       = document.getElementById('grid-peliculas');
const elBuscador   = document.getElementById('buscador');

const elModal      = document.getElementById('modal-reproductor');
const elOverlay    = document.getElementById('modal-overlay');
const elCerrar     = document.getElementById('modal-cerrar');
const elModalTitulo= document.getElementById('modal-titulo');
const elVideoSrc   = document.getElementById('video-src');
const elVideo      = document.getElementById('reproductor');

/* --------------------------------------------------
   INSTANCIA DE PLYR (reproductor de video)
   Opciones de configuración disponibles en:
   https://github.com/sampotts/plyr#options
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
    'captions',
    'settings',
    'pip',
    'fullscreen',
  ],
  settings: ['quality', 'speed'],
  speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
  keyboard: { focused: true, global: true },
  tooltips: { controls: true, seek: true },
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
let todasLasPeliculas = []; // Lista completa cargada desde Drive

/* =============================================
   FUNCIÓN PRINCIPAL: cargar archivos de Drive
   ============================================= */
async function cargarPeliculas() {
  mostrarEstado('cargando');

  try {
    /* Construimos la URL de la API:
       - q: buscamos archivos dentro de la carpeta y que no estén en la papelera
       - fields: solo pedimos los campos que necesitamos (ahorra datos)
       - pageSize: máximo de archivos por solicitud (ajustar si tienes más de 100)
       - key: nuestra API Key */
    const campos   = 'files(id,name,mimeType,size)';
    const consulta = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed = false`);
    const url      = `${API_BASE}?q=${consulta}&fields=${campos}&pageSize=100&key=${API_KEY}`;

    const respuesta = await fetch(url);

    /* Si la API devuelve error (clave inválida, sin permisos, etc.) */
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      const msg   = datos?.error?.message || `Error HTTP ${respuesta.status}`;
      throw new Error(msg);
    }

    const datos    = await respuesta.json();
    const archivos = datos.files || [];

    /* Filtramos solo los archivos de video */
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
   Verifica por mimeType y por extensión.
   ============================================= */
function esVideo(archivo) {
  /* Google Drive asigna mimeType de video a archivos conocidos */
  if (archivo.mimeType && archivo.mimeType.startsWith('video/')) return true;

  /* Verificamos la extensión del nombre como respaldo */
  const extension = archivo.name.split('.').pop().toLowerCase();
  return TIPOS_VIDEO.includes(extension);
}

/* =============================================
   RENDERIZAR GRID de tarjetas
   ============================================= */
function renderizarGrid(peliculas) {
  /* Limpiamos el grid antes de volver a renderizar (por búsqueda) */
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
  /* El nombre limpio quita la extensión del archivo */
  const nombreLimpio = pelicula.name.replace(/\.[^/.]+$/, '');

  /* Formato legible del tamaño */
  const tamano = pelicula.size ? formatearTamano(Number(pelicula.size)) : 'Video';

  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta';

  /* Retraso escalonado para la animación de entrada */
  tarjeta.style.animationDelay = `${indice * 0.06}s`;

  tarjeta.setAttribute('role', 'button');
  tarjeta.setAttribute('tabindex', '0');
  tarjeta.setAttribute('aria-label', `Reproducir ${nombreLimpio}`);

  tarjeta.innerHTML = `
    <div class="tarjeta-poster">
      <!-- Ícono de película -->
      <svg class="poster-icono" xmlns="http://www.w3.org/2000/svg"
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
      <span class="poster-tipo">Video</span>

      <!-- Botón play al hacer hover -->
      <div class="poster-play" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="currentColor" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
    </div>

    <div class="tarjeta-info">
      <p class="tarjeta-titulo" title="${nombreLimpio}">${nombreLimpio}</p>
      <p class="tarjeta-meta">${tamano}</p>
    </div>
  `;

  /* Evento: clic con mouse */
  tarjeta.addEventListener('click', () => abrirReproductor(pelicula.id, nombreLimpio));

  /* Evento: teclado (Enter o Espacio) para accesibilidad */
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
   Construye la URL de streaming de Google Drive
   ============================================= */
function abrirReproductor(fileId, titulo) {
  /* URL de streaming directo de Google Drive.
     Esta URL funciona para archivos públicos. */
  const urlVideo = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;

  elModalTitulo.textContent = titulo;

  /* Actualizamos la fuente del video y recargamos Plyr */
  reproductor.source = {
    type: 'video',
    sources: [
      {
        src: urlVideo,
        type: 'video/mp4',
      },
    ],
  };

  /* Mostramos el modal */
  elModal.classList.remove('oculto');
  document.body.style.overflow = 'hidden'; /* Bloqueamos scroll del fondo */
}

/* =============================================
   CERRAR REPRODUCTOR
   ============================================= */
function cerrarReproductor() {
  reproductor.pause();
  elModal.classList.add('oculto');
  document.body.style.overflow = ''; /* Restauramos scroll */
}

/* =============================================
   BÚSQUEDA EN TIEMPO REAL
   Filtra las tarjetas según lo que escribe el usuario.
   ============================================= */
elBuscador.addEventListener('input', () => {
  const termino = elBuscador.value.trim().toLowerCase();

  if (termino === '') {
    /* Si buscador está vacío, mostramos todo */
    renderizarGrid(todasLasPeliculas);
    return;
  }

  const filtradas = todasLasPeliculas.filter(p =>
    p.name.toLowerCase().includes(termino)
  );

  renderizarGrid(filtradas);

  /* Si no hay resultados con ese filtro */
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

/* Cerrar con el botón X */
elCerrar.addEventListener('click', cerrarReproductor);

/* Cerrar al hacer clic en el overlay oscuro */
elOverlay.addEventListener('click', cerrarReproductor);

/* Cerrar con la tecla Escape */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !elModal.classList.contains('oculto')) {
    cerrarReproductor();
  }
});

/* =============================================
   FUNCIÓN: Mostrar estado de la interfaz
   estados posibles: 'cargando' | 'vacio' | 'error' | 'coleccion'
   ============================================= */
function mostrarEstado(estado) {
  elCargando.classList.add('oculto');
  elVacio.classList.add('oculto');
  elError.classList.add('oculto');
  elColeccion.classList.add('oculto');

  switch (estado) {
    case 'cargando':   elCargando.classList.remove('oculto');  break;
    case 'vacio':      elVacio.classList.remove('oculto');     break;
    case 'error':      elError.classList.remove('oculto');     break;
    case 'coleccion':  elColeccion.classList.remove('oculto'); break;
  }
}

/* =============================================
   FUNCIÓN: Formatear tamaño de archivo
   Convierte bytes a KB / MB / GB legible.
   ============================================= */
function formatearTamano(bytes) {
  if (bytes < 1024)                    return `${bytes} B`;
  if (bytes < 1024 * 1024)             return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024)      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/* =============================================
   INICIO — Ejecutamos al cargar la página
   ============================================= */
document.addEventListener('DOMContentLoaded', cargarPeliculas);
