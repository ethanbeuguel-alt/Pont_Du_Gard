// utils.js - Fonctions utilitaires (ou "boîte à outils" de l'appli)
// Ici je mets tout ce qui sert un peu partout : gestion de la modale, formatage de texte, HTML des popups, etc.

// ---------- GESTION DE LA MODALE (création de point) ----------

/**
 * Réinitialise tous les champs du formulaire de création de point.
 * Je remets tout à zéro pour ne pas garder les valeurs du point précédent.
 */
function resetModalFields() {
  titleInput.value = '';
  descInput.value = '';
  urgencySelect.value = 'peu urgent';
  groupSelect.value = 'Ne sait pas';
  photosInput.value = '';
}

/**
 * Ouvre la modale pour ajouter un point sur la CARTE (Leaflet).
 * @param {object} latlng - { lat, lng } renvoyé par Leaflet
 */
function openModalForMap(latlng) {
  // Je mémorise temporairement le type de localisation + coordonnées
  pendingLocation = {
    type: 'map',
    lat: latlng.lat,
    lng: latlng.lng
  };

  resetModalFields();
  modalOverlay.style.display = 'flex';
  titleInput.focus();
}

/**
 * Ouvre la modale pour ajouter un point sur un PLAN (image).
 * @param {number} planIndex - numéro du plan (0 = RDC, 1 = étage 1, etc.)
 * @param {number} relX - position relative en X (entre 0 et 1)
 * @param {number} relY - position relative en Y (entre 0 et 1)
 */
function openModalForPlan(planIndex, relX, relY) {
  // Même logique que pour la carte, mais version "plan"
  pendingLocation = {
    type: 'plan',
    planIndex,
    relX,
    relY
  };

  resetModalFields();
  modalOverlay.style.display = 'flex';
  titleInput.focus();
}

/**
 * Ferme la modale et oublie la localisation en attente.
 */
function closeModal() {
  modalOverlay.style.display = 'none';
  pendingLocation = null;
}


// ---------- FORMATAGE / AIDE GÉNÉRIQUE ----------

/**
 * Sécurise une chaîne de caractères pour l'injecter dans du HTML
 * (évite les injections / balises qui cassent tout).
 */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

/**
 * Donne une couleur en fonction du niveau d'urgence du point.
 * Utilisé pour les marqueurs et l'affichage dans les popups.
 */
function getUrgencyColor(urgency) {
  switch (urgency) {
    case 'peu urgent': return 'green';
    case 'urgent':     return 'orange';
    case 'très urgent':return 'red';
    default:           return 'blue';
  }
}

/**
 * Transforme le niveau d'urgence en "score" numérique pour pouvoir trier facilement.
 */
function urgencyRank(urgency) {
  switch (urgency) {
    case 'très urgent': return 3;
    case 'urgent':      return 2;
    case 'peu urgent':  return 1;
    default:            return 0;
  }
}

/**
 * Retourne une chaîne du style "3 h 20 min" ou "42 s"
 * qui représente le temps écoulé depuis createdAt jusqu'à maintenant.
 */
function formatElapsed(createdAt) {
  const now = Date.now();
  const diffMs = now - createdAt.getTime();// en millisecondes
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec} s`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h ${diffMin % 60} min`;

  const diffJ = Math.floor(diffH / 24);
  return `${diffJ} j ${diffH % 24} h`;
}

/**
 * Même principe que formatElapsed, mais entre createdAt et deletedAt.
 * Sert pour savoir combien de temps un problème est resté "ouvert".
 */
function formatDuration(createdAt, deletedAt) {
  const diffMs = deletedAt.getTime() - createdAt.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec} s`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h ${diffMin % 60} min`;

  const diffJ = Math.floor(diffH / 24);
  return `${diffJ} j ${diffH % 24} h`;
}

// Liste officielle des groupes d'activité gérés par l'appli.
// Je centralise ça ici pour éviter d'avoir la même liste répétée partout.
const GROUPS = [
  "Sécurité",
  "Espace nature",
  "Régie",
  "Propreté",
  "Maintenance",
  "Culture",
  "Accueil",
  "Médiation",
  "Restauration",
  "Boutique",
  "Commercial",
  "Autre",
  "Ne sait pas"
];

/**
 * Retourne un texte humain pour décrire la localisation du point
 * (carte extérieure ou plan + étage).
 */
function getLocationLabel(p) {
  if (p.locationType === 'plan') {
    const idx = typeof p.planIndex === 'number' ? p.planIndex : 0;
    if (idx === 0) return 'Plan bâtiment – RDC';
    if (idx === 1) return 'Plan bâtiment – Étage 1';
    if (idx === 2) return 'Plan bâtiment – Étage 2';
    return 'Plan bâtiment';
  }
  return 'Carte extérieure';
}


// ---------- COMMENTAIRES & PHOTOS DANS LA POPUP ----------

/**
 * Construit le HTML de la partie "Commentaires" pour un point.
 * Si aucun commentaire, j'affiche un petit texte en italique.
 */
function buildCommentsHtml(p) {
  if (!p.comments || p.comments.length === 0) {
    return '<i>Pas encore de commentaire.</i>';
  }

  return p.comments.map(c =>
    `- ${escapeHtml(c.text)} <span style="font-size:0.75rem;color:#666;">(${c.createdAt.toLocaleString()})</span>`
  ).join('<br>');
}

/**
 * Construit le HTML de la partie "Photos" pour un point.
 * Ici j'affiche les photos en bas de la popup, en petit.
 */
function buildPhotosHtml(p) {
  if (!p.photos || p.photos.length === 0) {
    return '<i>Aucune photo.</i>';
  }

  return p.photos.map(ph =>
    `<div>
       <img src="${ph.data}" alt="${escapeHtml(ph.name)}"
         style="max-width:100%;max-height:100px;border-radius:8px;border:1px solid #e5e7eb;margin-top:4px;" />
     </div>`
  ).join('');
}

/**
 * Construit TOUT le contenu HTML de la popup d'un point (carte ou plan).
 * - Titre
 * - Groupe (avec select modifiable)
 * - Localisation (carte / plan)
 * - Description
 * - Urgence (avec couleur)
 * - Coordonnées + bouton "Y aller" si sur la carte
 * - Bouton "Ajouter un commentaire"
 * - Liste des commentaires
 * - Liste des photos
 */
function buildPopupHtml(p) {
  const color = getUrgencyColor(p.urgency);
  const currentGroup = p.group || 'Ne sait pas';

  // Je construis les options du <select> de groupe
  const optionsHtml = GROUPS.map(g => `
    <option value="${g}" ${g === currentGroup ? 'selected' : ''}>${g}</option>
  `).join('');

  const locationText = getLocationLabel(p);

  // Gestion facultative des coordonnées (seulement si le point est sur la carte)
  let coordText = '';
  let goButtonHtml = '';
  const hasCoords = (p.locationType !== 'plan' && typeof p.lat === 'number' && typeof p.lng === 'number');
  if (hasCoords) {
    coordText = `(${p.lat.toFixed(5)}, ${p.lng.toFixed(5)})`;
    goButtonHtml = `<br><br><button onclick="goToPoint(${p.id})">Y aller</button>`;
  }

  // Je renvoie un gros bloc HTML qui sera injecté dans la popup Leaflet ou dans le popup du plan
  return `
    <div style="padding-right: 12px;">
      <b>[#${p.id}] ${escapeHtml(p.title)}</b><br>
      <b>Groupe :</b>
      <select onchange="changePointGroup(${p.id}, this.value)">
        ${optionsHtml}
      </select>
      <br>
      <b>Localisation :</b> ${escapeHtml(locationText)}<br>
      ${escapeHtml(p.description)}<br>
      Urgence :
      <span style="color:${color};">● ${escapeHtml(p.urgency)}</span><br><br>
      ${coordText}${goButtonHtml}<br><br>
      <button onclick="addComment(${p.id})">Ajouter un commentaire</button>
      <hr>
      <b>Commentaires :</b><br>
      ${buildCommentsHtml(p)}
      <hr>
      <b>Photos :</b><br>
      ${buildPhotosHtml(p)}
    </div>
  `;
}

/**
 * Affiche le popup custom (HTML) pour un point situé sur un plan.
 * Ici je calcule la position du popup en fonction de la position relative du point
 * pour qu'il soit "proche" du marqueur et qu'il ne sorte pas du cadre.
 */
function showPlanPopupForPoint(p) {
  if (p.locationType !== 'plan') return;

  const idx = typeof p.planIndex === 'number' ? p.planIndex : 0;
  const planView = planViews[idx];
  if (!planView) return;

  const relX = typeof p.relX === 'number' ? p.relX : 0.5;
  const relY = typeof p.relY === 'number' ? p.relY : 0.5;

  // Rectangles pour calculer les positions
  const rectPlan = planView.getBoundingClientRect();
  const rectWrapper = mapWrapper.getBoundingClientRect();

  // Position absolue du point dans la page
  const absX = rectPlan.left + relX * rectPlan.width;
  const absY = rectPlan.top + relY * rectPlan.height;

  // Position "brute" relative au wrapper
  let left = absX - rectWrapper.left + 8;
  let top = absY - rectWrapper.top - 10;

  // Je mets d'abord le contenu dans le popup pour pouvoir mesurer sa taille
  planPopupContent.innerHTML = buildPopupHtml(p);
  planPopup.style.display = 'block';
  planPopup.style.left = '0px';
  planPopup.style.top = '0px';

  const popupRect = planPopup.getBoundingClientRect();
  const popupWidth = popupRect.width;
  const popupHeight = popupRect.height;

  const margin = 8;

  // Ajustement horizontal : je m'assure que le popup reste dans le wrapper
  const maxLeft = rectWrapper.width - popupWidth - margin;
  if (left < margin) left = margin;
  if (left > maxLeft) left = maxLeft;

  // Ajustement vertical
  const maxTop = rectWrapper.height - popupHeight - margin;
  if (top < margin) top = margin;
  if (top > maxTop) top = maxTop;

  planPopup.style.left = left + 'px';
  planPopup.style.top = top + 'px';
}


// ---------- CHANGEMENT DE GROUPE DEPUIS LA POPUP ----------

/**
 * Change le groupe d'activité d'un point (via le <select> dans la popup).
 * On met à jour :
 *  - l'objet JS
 *  - le contenu de la popup (car il contient le groupe)
 *  - la liste des points
 *  - la visibilité (filtres)
 *  - et on sauvegarde l'état
 */
function changePointGroup(id, newGroup) {
  const p = points.find(pt => pt.id === id);
  if (!p) return;

  // Si rien n'est mis, je repasse à "Ne sait pas"
  p.group = newGroup || 'Ne sait pas';

  // Si le point a un marker Leaflet, je regénère le contenu de la popup
  if (p.marker) {
    p.marker.setPopupContent(buildPopupHtml(p));
  }

  // Si le point est sur un plan, je regénère aussi le popup de plan
  if (p.locationType === 'plan') {
    showPlanPopupForPoint(p);
  }

  // Je mets à jour la liste en bas + les filtres de visibilité
  renderPointsList();
  applyVisibilityFilter();

  // Et je sauvegarde tout ça dans le localStorage
  saveState();
}
