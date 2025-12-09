// map.js - Carte Leaflet, gestion des plans et navigation entre les vues (carte / plans)
// Ici je gère tout ce qui touche à l'affichage géographique : carte extérieure + plans du bâtiment,
// boutons de navigation, géolocalisation, et filtres d'affichage.

// ---------- CARTE LEAFLET ----------

// Initialisation de la carte centrée sur le Pont du Gard
const map = L.map('map').setView([43.9475, 4.5350], 16);

// Fond de carte OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Petit marqueur "Pont du Gard" pour repère visuel
L.marker([43.9475, 4.5350])
  .addTo(map)
  .bindPopup('Pont du Gard');

// Bouton pour recentrer la carte sur le Pont du Gard
document.getElementById('recenter-btn').addEventListener('click', () => {
  map.setView([43.9475, 4.5350], 15);
});

// Gestion des boutons de géolocalisation (afficher ma position / créer un point à ma position)
const locateBtn = document.getElementById('locate-btn');
const locateAddBtn = document.getElementById('locate-add-btn');

// Marqueur et cercle de précision pour la localisation de l'utilisateur
let locateMarker = null;
let locateCircle = null;

/**
 * Fonction générique pour gérer la géolocalisation navigateur.
 * - button : bouton cliqué (pour afficher "Recherche..." et le désactiver pendant la demande)
 * - onSuccess : callback appelé avec { lat, lng, accuracy } quand la géoloc réussit
 */
function handleGeoloc(button, onSuccess) {
  if (!navigator.geolocation) {
    alert("La géolocalisation n'est pas disponible sur cet appareil ou sans HTTPS.");
    return;
  }
  if (!button) return;

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Recherche...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy || 60; // rayon de précision en mètres

      if (typeof onSuccess === 'function') {
        onSuccess({ lat, lng, accuracy });
      }

      button.disabled = false;
      button.textContent = originalLabel;
    },
    (err) => {
      console.error("Erreur de géolocalisation", err);
      alert("Impossible de récupérer votre position (permission refusée ou géolocalisation indisponible).");
      button.disabled = false;
      button.textContent = originalLabel;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  );
}

// Bouton "📍 Ma position" : on affiche juste ma position sur la carte
if (locateBtn) {
  locateBtn.addEventListener('click', () => {
    handleGeoloc(locateBtn, ({ lat, lng, accuracy }) => {
      // On nettoie les anciens marqueurs de localisation si besoin
      if (locateMarker) {
        map.removeLayer(locateMarker);
        locateMarker = null;
      }
      if (locateCircle) {
        map.removeLayer(locateCircle);
        locateCircle = null;
      }

      // Marqueur + cercle de précision autour de ma position
      locateMarker = L.marker([lat, lng]).addTo(map).bindPopup("Votre position");
      locateCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: "#0f766e",
        fillColor: "#22c55e",
        fillOpacity: 0.18
      }).addTo(map);

      map.setView([lat, lng], 17);
    });
  });
}

// Bouton "➕ Point sur ma position" : on ouvre directement la modale de création de point à ma position
if (locateAddBtn) {
  locateAddBtn.addEventListener('click', () => {
    handleGeoloc(locateAddBtn, ({ lat, lng }) => {
      if (typeof openModalForMap === "function") {
        // Je réutilise la même modale que pour un clic sur la carte
        openModalForMap({ lat, lng });
      } else {
        alert("Impossible d'ouvrir la création de point pour cette position.");
      }
    });
  });
}

// Wrapper général de la carte + plans (sert aussi de référence pour les popups de plan)
const mapWrapper = document.getElementById('map-wrapper');


// ---------- VUES : CARTE + 3 PLANS ----------

// Div qui contient la carte Leaflet
const mapDiv = document.getElementById('map');

// Tableau des 3 vues de plan (RDC, étage 1, étage 2)
const planViews = [
  document.getElementById('plan-view-0'),
  document.getElementById('plan-view-1'),
  document.getElementById('plan-view-2')
];

// Boutons de navigation entre les vues (précédent / suivant)
const prevBtn = document.getElementById('view-prev-btn');
const nextBtn = document.getElementById('view-next-btn');

// Popup custom utilisé uniquement pour les points sur les plans (pas la carte Leaflet)
const planPopup = document.getElementById('plan-popup');
const planPopupContent = document.getElementById('plan-popup-content');
const planPopupClose = document.getElementById('plan-popup-close');

/**
 * Masque le popup du plan et vide son contenu.
 */
function hidePlanPopup() {
  planPopup.style.display = 'none';
  planPopupContent.innerHTML = '';
}

// Fermeture via la croix du popup sur plan
planPopupClose.addEventListener('click', hidePlanPopup);

// Index de la vue courante : 0 = carte, 1..3 = plans
let currentViewIndex = 0;

/**
 * Met à jour l'affichage en fonction de currentViewIndex.
 * - 0 → on affiche la carte, on cache les plans
 * - 1..3 → on cache la carte, on affiche seulement le plan correspondant
 */
function updateView() {
  hidePlanPopup();

  if (currentViewIndex === 0) {
    // Vue "carte"
    mapDiv.style.display = 'block';
    planViews.forEach(pv => pv.style.display = 'none');

    // Leaflet a besoin de recalculer la taille de la carte quand on la ré-affiche
    setTimeout(() => map.invalidateSize(), 50);
  } else {
    // Vue "plan"
    mapDiv.style.display = 'none';
    planViews.forEach((pv, idx) => {
      pv.style.display = (idx === currentViewIndex - 1) ? 'block' : 'none';
    });
  }
}

/**
 * Change de vue (carte / plan) en ajoutant delta à currentViewIndex
 * (logique de carrousel : on boucle quand on dépasse).
 */
function changeView(delta) {
  const totalViews = 1 + planViews.length; // 1 carte + 3 plans
  currentViewIndex = (currentViewIndex + delta + totalViews) % totalViews;
  updateView();
}

// Clic sur les flèches ◀ ▶ pour changer de vue
prevBtn.addEventListener('click', () => changeView(-1));
nextBtn.addEventListener('click', () => changeView(1));

// Initialisation de la vue au chargement
updateView();

/**
 * Donne les coordonnées relatives (entre 0 et 1) d'un clic dans un élément,
 * pour pouvoir les stocker et réafficher un marqueur au bon endroit sur l'image de plan.
 */
function getRelativeCoordinates(event, element) {
  const rect = element.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  return {
    x: Math.min(Math.max(x, 0), 1),
    y: Math.min(Math.max(y, 0), 1)
  };
}

// Clic sur un plan : création d'un nouveau point à l'endroit cliqué
planViews.forEach((pv, idx) => {
  pv.addEventListener('click', (e) => {
    // Si on clique sur un marqueur déjà existant, on ne recrée pas un point
    if (e.target.classList.contains('plan-marker')) return;

    // Sécurité : je vérifie qu'on est bien sur la bonne vue
    if (currentViewIndex !== idx + 1) return;

    hidePlanPopup();

    // Je calcule la position relative du clic dans le plan
    const { x, y } = getRelativeCoordinates(e, pv);

    // Et j'ouvre la modale avec les infos du plan / position
    openModalForPlan(idx, x, y);
  });
});


// ---------- FILTRE D'AFFICHAGE SUR LA CARTE ----------

/**
 * Applique les filtres de visibilité des groupes sur les marqueurs de la CARTE (Leaflet).
 * (Pour l'instant, ça ne touche que les points qui ont un marker Leaflet, pas les plans.)
 */
function applyVisibilityFilter() {
  // Je récupère l'état de tous les checkboxes de filtre
  const showSec = filterSecurite.checked;
  const showNature = filterNature.checked;
  const showRegie = filterRegie.checked;
  const showProprete = filterProprete.checked;
  const showMaintenance = filterMaintenance.checked;
  const showCulture = filterCulture.checked;
  const showAccueil = filterAccueil.checked;
  const showMediation = filterMediation.checked;
  const showRestauration = filterRestauration.checked;
  const showBoutique = filterBoutique.checked;
  const showCommercial = filterCommercial.checked;
  const showAutre = filterAutre.checked;
  const showUnknown = filterUnknown.checked;

  // Je passe sur tous les points pour décider si on affiche ou non leur marker sur la carte
  points.forEach(p => {
    if (!p.marker) return; // Si pas de marker Leaflet (ex : point uniquement sur plan), je ne fais rien ici

    const g = p.group || 'Ne sait pas';
    let shouldShow = false;

    switch (g) {
      case 'Sécurité':
        shouldShow = showSec;
        break;
      case 'Espace nature':
        shouldShow = showNature;
        break;
      case 'Régie':
        shouldShow = showRegie;
        break;
      case 'Propreté': 
        shouldShow = showProprete;
        break;
      case 'Maintenance':
        shouldShow = showMaintenance;
        break;
      case 'Culture':
        shouldShow = showCulture;
        break;
      case 'Accueil':
        shouldShow = showAccueil;
        break;
      case 'Restauration':
        shouldShow = showRestauration;
        break;
      case 'Boutique':
        shouldShow = showBoutique;
        break;
      case 'Commercial':
        shouldShow = showCommercial;
        break;
      case 'Autre':
        shouldShow = showAutre;
        break;
      case 'Ne sait pas':
      default:
        shouldShow = showUnknown;
        break;
    }

    const isOnMap = map.hasLayer(p.marker);

    // Si on doit l'afficher et qu'il n'est pas encore sur la carte → on l'ajoute
    if (shouldShow && !isOnMap) {
      p.marker.addTo(map);
    }
    // Si on ne doit pas l'afficher et qu'il est actuellement visible → on l'enlève
    else if (!shouldShow && isOnMap) {
      map.removeLayer(p.marker);
    }
  });
}
