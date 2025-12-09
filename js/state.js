// state.js - gestion de l'état principal de l'appli (points, historique, import/export, localStorage)

// ---------- DONNÉES ----------

let points = [];           // Points actifs
let deletedPoints = [];    // Points supprimés (historique)
let pointIdCounter = 1;    // id unique pour les nouveaux points
const STORAGE_KEY = 'pont_du_gard_points_v8';

let pendingLocation = null; // { type: 'map'|'plan', ... }
let currentSort = 'urgency';

// ---------- RÉFÉRENCES DOM ----------

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

function openPhoto(pointId, photoIndex) {
  const p = points.find(pt => pt.id === pointId);
  if (!p || !p.photos || !p.photos[photoIndex]) return;

  const ph = p.photos[photoIndex];
  imageViewerImg.src = ph.data;
  imageViewerImg.alt = ph.name || '';
  imageViewerOverlay.style.display = 'flex';
}

function closeImageViewer() {
  imageViewerOverlay.style.display = 'none';
  imageViewerImg.src = '';
}

imageViewerClose.addEventListener('click', closeImageViewer);
imageViewerOverlay.addEventListener('click', (e) => {
  if (e.target === imageViewerOverlay) closeImageViewer();
});

// ---------- SAUVEGARDE / EXPORT / IMPORT ----------

function exportData() {
  try {
    saveState();
    const raw = localStorage.getItem(STORAGE_KEY) || '{}';
    const blob = new Blob([raw], { type: 'application/json' });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = 'pont_du_gard_points_' + timestamp + '.json';

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

function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const data = JSON.parse(text);

      if (!data || typeof data !== 'object' || !Array.isArray(data.points)) {
        alert("Fichier invalide : format non reconnu.");
        return;
      }

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

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- MARQUEURS SUR PLANS & CARTE ----------

function attachPlanMarkerToPoint(p) {
  const idx = typeof p.planIndex === 'number' ? p.planIndex : 0;
  const planView = planViews[idx];
  if (!planView) return;

  const relX = typeof p.relX === 'number' ? p.relX : 0.5;
  const relY = typeof p.relY === 'number' ? p.relY : 0.5;

  const markerEl = document.createElement('div');
  markerEl.className = 'plan-marker';
  markerEl.style.left = (relX * 100) + '%';
  markerEl.style.top = (relY * 100) + '%';
  markerEl.title = p.title;

  markerEl.addEventListener('click', (e) => {
    e.stopPropagation();
    focusOnPoint(p.id);
    showPlanPopupForPoint(p);
  });

  planView.appendChild(markerEl);
  p.planMarker = markerEl;
}

function attachMarkerToPoint(p) {
  if (p.locationType === 'plan') {
    attachPlanMarkerToPoint(p);
    return;
  }

  p.locationType = 'map';

  const color = getUrgencyColor(p.urgency);

  const marker = L.circleMarker([p.lat, p.lng], {
    radius: 8,
    color: color,
    fillColor: color,
    fillOpacity: 0.8
  }).addTo(map);

  marker.bindPopup(buildPopupHtml(p));
  marker.on('click', () => marker.openPopup());

  p.marker = marker;
}

// ---------- CHARGEMENT LOCALSTORAGE ----------

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    pointIdCounter = data.pointIdCounter || 1;
    points = [];
    deletedPoints = [];

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

        attachMarkerToPoint(point);
        points.push(point);
      });
    }

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

// ---------- CHARGEMENT DEPUIS FIRESTORE ----------

async function loadFromFirestore() {
  if (typeof db === 'undefined') {
    console.warn('Firebase non initialisé, utilisation uniquement du localStorage.');
    return;
  }

  try {
    console.log('Chargement des points depuis Firestore (fusion avec local)…');

    let maxId = pointIdCounter;

    // --- 1) Points actifs ---
    const snap = await db.collection('points').get();

    snap.forEach(doc => {
      const d = doc.data();
      const idNum = typeof d.id === 'number' ? d.id : parseInt(d.id, 10) || 0;
      if (idNum > maxId) maxId = idNum;

      // si le point existe déjà localement, on ne le recrée pas
      const already = points.find(p => p.id === idNum);
      if (already) return;

      const point = {
        id: idNum,
        title: d.title,
        description: d.description,
        urgency: d.urgency,
        group: d.group || 'Ne sait pas',
        locationType: d.locationType || 'map',
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        planIndex: d.planIndex ?? null,
        relX: d.relX ?? null,
        relY: d.relY ?? null,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        comments: Array.isArray(d.comments)
          ? d.comments.map(c => ({
              text: c.text,
              createdAt: c.createdAt ? new Date(c.createdAt) : new Date()
            }))
          : [],
        photos: Array.isArray(d.photos)
          ? d.photos.map(ph => ({
              name: ph.name,
              data: ph.data
            }))
          : []
      };

      attachMarkerToPoint(point);
      points.push(point);
    });

    // --- 2) Points supprimés / historique ---
    const snapDel = await db.collection('deletedPoints').get();

    snapDel.forEach(doc => {
      const d = doc.data();
      const idNum = typeof d.id === 'number' ? d.id : parseInt(d.id, 10) || 0;
      if (idNum > maxId) maxId = idNum;

      const already = deletedPoints.find(p => p.id === idNum);
      if (already) return;

      deletedPoints.push({
        id: idNum,
        title: d.title,
        description: d.description,
        urgency: d.urgency,
        group: d.group || 'Ne sait pas',
        locationType: d.locationType || 'map',
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        planIndex: d.planIndex ?? null,
        relX: d.relX ?? null,
        relY: d.relY ?? null,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        deletedAt: d.deletedAt ? new Date(d.deletedAt) : new Date(),
        comments: Array.isArray(d.comments)
          ? d.comments.map(c => ({
              text: c.text,
              createdAt: c.createdAt ? new Date(c.createdAt) : new Date()
            }))
          : [],
        photos: Array.isArray(d.photos)
          ? d.photos.map(ph => ({
              name: ph.name,
              data: ph.data
            }))
          : []
      });
    });

    pointIdCounter = maxId + 1;
    saveState(); // on sauvegarde la fusion en local
  } catch (err) {
    console.error('Erreur lors du chargement Firestore', err);
  }
}

