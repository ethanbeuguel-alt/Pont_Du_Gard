// state.js - gestion de l'état principal de l'appli (points, historique, import/export, localStorage)
// J'essaie de centraliser ici tout ce qui touche aux données et à leur sauvegarde.

// ---------- DONNÉES ----------

// Tableau des points actuellement visibles sur la carte / les plans
let points = [];

// Tableau des points supprimés (pour l'historique)
let deletedPoints = [];

// Compteur pour donner un id unique à chaque nouveau point
let pointIdCounter = 1;

// Clé utilisée dans le localStorage pour stocker les données
const STORAGE_KEY = 'pont_du_gard_points_v8';

// Variable utilisée quand on attend que l'utilisateur clique sur la carte ou un plan
// (par exemple : "en attente de la position d'un nouveau point")
let pendingLocation = null; // { type: 'map'|'plan', ... }

// Critère de tri actuellement sélectionné (par défaut : niveau d'urgence)
let currentSort = 'urgency';

// ---------- RÉFÉRENCES DOM ----------
// Ici je récupère toutes les références vers les éléments HTML dont j'ai besoin

const modalOverlay = document.getElementById('modal-overlay');
const titleInput = document.getElementById('point-title');
const descInput = document.getElementById('point-description');
const urgencySelect = document.getElementById('point-urgency');
const groupSelect = document.getElementById('point-group');
const photosInput = document.getElementById('point-photos');
const cancelBtn = document.getElementById('cancel-btn');
const createBtn = document.getElementById('create-btn');

const sortSelect = document.getElementById('sort-select');
const filterSecurite = document.getElementById('filter-securite');
const filterNature = document.getElementById('filter-nature');
const filterRegie = document.getElementById('filter-regie');
const filterProprete = document.getElementById('filter-proprete');
const filterMaintenance = document.getElementById('filter-maintenance');
const filterCulture = document.getElementById('filter-culture');
const filterAccueil = document.getElementById('filter-accueil');
const filterMediation = document.getElementById('filter-mediation');
const filterRestauration = document.getElementById('filter-restauration');
const filterBoutique = document.getElementById('filter-boutique');
const filterCommercial = document.getElementById('filter-commercial');
const filterAutre = document.getElementById('filter-autre');
const filterUnknown = document.getElementById('filter-unknown');

const imageViewerOverlay = document.getElementById('image-viewer-overlay');
const imageViewerImg = document.getElementById('image-viewer-img');
const imageViewerClose = document.getElementById('image-viewer-close');

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');


// ---------- GESTION DES PHOTOS (LIGHTBOX) ----------

/**
 * Ouvre la lightbox pour afficher une photo d'un point
 * @param {number} pointId - id du point
 * @param {number} photoIndex - index de la photo dans le tableau p.photos
 */
function openPhoto(pointId, photoIndex) {
  // Je retrouve le point correspondant
  const p = points.find(pt => pt.id === pointId);
  if (!p || !p.photos || !p.photos[photoIndex]) return;

  const ph = p.photos[photoIndex];

  // J'affiche l'image dans l'overlay
  imageViewerImg.src = ph.data;
  imageViewerImg.alt = ph.name || '';
  imageViewerOverlay.style.display = 'flex';
}

// Ferme la lightbox d'image
function closeImageViewer() {
  imageViewerOverlay.style.display = 'none';
  imageViewerImg.src = '';
}

// Fermeture via la croix
imageViewerClose.addEventListener('click', closeImageViewer);

// Fermeture si on clique en dehors de l'image
imageViewerOverlay.addEventListener('click', (e) => {
  if (e.target === imageViewerOverlay) closeImageViewer();
});


// ---------- SAUVEGARDE / EXPORT / IMPORT ----------

/**
 * Exporte les données en JSON en se basant sur ce qui est dans le localStorage.
 * Je force d'abord un saveState pour être sûr d'exporter l'état le plus à jour.
 */
function exportData() {
  try {
    // Je sauvegarde d'abord l'état actuel
    saveState();

    // Je récupère brut ce qui est stocké dans le localStorage
    const raw = localStorage.getItem(STORAGE_KEY) || '{}';

    // Je crée un fichier JSON à partir de ça
    const blob = new Blob([raw], { type: 'application/json' });

    // Nom de fichier avec timestamp (pour retrouver facilement la version)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = 'pont_du_gard_points_' + timestamp + '.json';

    // Création d'un lien de téléchargement "invisible"
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Erreur export données', e);
    alert("Erreur lors de l'export des données.");
  }
}

/**
 * Gestion de l'import d'un fichier JSON
 * (appelée quand l'utilisateur choisit un fichier dans le champ <input type="file">)
 */
function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const data = JSON.parse(text);

      // Je vérifie un minimum que le fichier ressemble bien à notre format
      if (!data || typeof data !== 'object' || !Array.isArray(data.points)) {
        alert("Fichier invalide : format non reconnu.");
        return;
      }

      // Je remplace ce qu'il y a dans le localStorage par ce qu'on vient d'importer
      localStorage.setItem(STORAGE_KEY, text);
      alert("Données importées. La page va se recharger.");
      window.location.reload();
    } catch (err) {
      console.error('Erreur import données', err);
      alert("Erreur lors de la lecture du fichier.");
    }
  };

  reader.readAsText(file);
}

/**
 * Sauvegarde l'état complet (points + points supprimés + compteur) dans localStorage
 * Les dates sont converties en string ISO pour être sérialisables.
 */
function saveState() {
  const data = {
    pointIdCounter,
    points: points.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      urgency: p.urgency,
      group: p.group,
      locationType: p.locationType,
      lat: p.lat,
      lng: p.lng,
      planIndex: p.planIndex,
      relX: p.relX,
      relY: p.relY,
      createdAt: p.createdAt.toISOString(),
      comments: (p.comments || []).map(c => ({
        text: c.text,
        createdAt: c.createdAt.toISOString()
      })),
      photos: (p.photos || []).map(ph => ({
        name: ph.name,
        data: ph.data
      }))
    })),
    deletedPoints: deletedPoints.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      urgency: p.urgency,
      group: p.group,
      locationType: p.locationType,
      lat: p.lat,
      lng: p.lng,
      planIndex: p.planIndex,
      relX: p.relX,
      relY: p.relY,
      createdAt: p.createdAt.toISOString(),
      deletedAt: p.deletedAt.toISOString(),
      comments: (p.comments || []).map(c => ({
        text: c.text,
        createdAt: c.createdAt.toISOString()
      })),
      photos: (p.photos || []).map(ph => ({
        name: ph.name,
        data: ph.data
      }))
    }))
  };

  // Stockage en une seule entrée JSON dans le localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// ---------- MARQUEURS SUR PLANS & CARTE ----------

/**
 * Crée et associe un "marqueur" (div absolute) à un point sur un plan (image).
 * Utilisé quand locationType === 'plan'.
 */
function attachPlanMarkerToPoint(p) {
  // On sécurise l'index de plan (0,1,2...)
  const idx = typeof p.planIndex === 'number' ? p.planIndex : 0;
  const planView = planViews[idx];
  if (!planView) return;

  // Position relative sur le plan (0-1 en X et Y)
  const relX = typeof p.relX === 'number' ? p.relX : 0.5;
  const relY = typeof p.relY === 'number' ? p.relY : 0.5;

  // Création du marqueur HTML
  const markerEl = document.createElement('div');
  markerEl.className = 'plan-marker';
  markerEl.style.left = (relX * 100) + '%';
  markerEl.style.top = (relY * 100) + '%';
  markerEl.title = p.title;

  // Au clic sur le marqueur : on met le point en avant + on affiche le popup du plan
  markerEl.addEventListener('click', (e) => {
    e.stopPropagation();
    focusOnPoint(p.id);
    showPlanPopupForPoint(p);
  });

  // On l'ajoute dans le DOM du plan
  planView.appendChild(markerEl);
  p.planMarker = markerEl;
}

/**
 * Crée et associe un marqueur Leaflet au point (ou un marqueur de plan si locationType === 'plan')
 */
function attachMarkerToPoint(p) {
  // Cas où le point est sur un plan (image)
  if (p.locationType === 'plan') {
    attachPlanMarkerToPoint(p);
    return;
  }

  // Par défaut, si rien n'est précisé, on considère que le point est sur la carte
  p.locationType = 'map';

  // Couleur du marqueur en fonction de l'urgence
  const color = getUrgencyColor(p.urgency);

  // Création du marker Leaflet
  const marker = L.circleMarker([p.lat, p.lng], {
    radius: 8,
    color: color,
    fillColor: color,
    fillOpacity: 0.8
  }).addTo(map);

  // Popup Leaflet avec le HTML du point
  marker.bindPopup(buildPopupHtml(p));
  marker.on('click', () => marker.openPopup());

  // On stocke la référence dans l'objet point
  p.marker = marker;
}


// ---------- CHARGEMENT DEPUIS LOCALSTORAGE ----------

/**
 * Recharge l'état à partir du localStorage :
 * - recrée les objets points et deletedPoints
 * - recrée les Date, les commentaires, les photos
 * - recrée les marqueurs sur la carte et sur les plans
 */
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    // On restaure le compteur d'id (si dispo)
    pointIdCounter = data.pointIdCounter || 1;

    // Restauration des points actifs
    if (Array.isArray(data.points)) {
      data.points.forEach(p => {
        const locationType = p.locationType || 'map';

        const point = {
          id: p.id,
          title: p.title,
          description: p.description,
          urgency: p.urgency,
          group: p.group || 'Ne sait pas',
          locationType,
          lat: p.lat,
          lng: p.lng,
          planIndex: p.planIndex,
          relX: p.relX,
          relY: p.relY,
          createdAt: new Date(p.createdAt),
          comments: Array.isArray(p.comments)
            ? p.comments.map(c => ({
                text: c.text,
                createdAt: new Date(c.createdAt)
              }))
            : [],
          photos: Array.isArray(p.photos)
            ? p.photos.map(ph => ({
                name: ph.name,
                data: ph.data
              }))
            : []
        };

        // On remet les marqueurs sur la carte ou les plans
        attachMarkerToPoint(point);

        // Et on ajoute le point au tableau principal
        points.push(point);
      });
    }

    // Restauration des points supprimés (historique)
    if (Array.isArray(data.deletedPoints)) {
      data.deletedPoints.forEach(p => {
        const locationType = p.locationType || 'map';

        deletedPoints.push({
          id: p.id,
          title: p.title,
          description: p.description,
          urgency: p.urgency,
          group: p.group || 'Ne sait pas',
          locationType,
          lat: p.lat,
          lng: p.lng,
          planIndex: p.planIndex,
          relX: p.relX,
          relY: p.relY,
          createdAt: new Date(p.createdAt),
          deletedAt: new Date(p.deletedAt),
          comments: Array.isArray(p.comments)
            ? p.comments.map(c => ({
                text: c.text,
                createdAt: new Date(c.createdAt)
              }))
            : [],
          photos: Array.isArray(p.photos)
            ? p.photos.map(ph => ({
                name: ph.name,
                data: ph.data
              }))
            : []
        });
      });
    }
  } catch (e) {
    console.error('Erreur de chargement localStorage', e);
  }
}
