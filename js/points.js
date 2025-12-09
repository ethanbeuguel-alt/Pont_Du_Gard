// points.js - Gestion des listes de points, des actions sur les points et de la création.
// En gros : tout ce qui concerne l’affichage des points, leur suppression, commentaires, photos, etc.

// ---------- RENDU LISTES (points actifs) ----------

/**
 * Met à jour la liste des points visibles dans le panneau "Points actuellement sur la carte".
 * Prend en compte : tri, filtres de groupes, temps écoulé, miniatures de photos, etc.
 */
function renderPointsList() {
  const container = document.getElementById('point-list');

  // Si aucun point, j'affiche juste un message
  if (points.length === 0) {
    container.innerHTML = '<p>Aucun point pour le moment.</p>';
    return;
  }

  // Je récupère l’état de tous les filtres (cases à cocher)
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

  // Petite fonction interne pour savoir si un groupe doit être affiché ou pas
  function isGroupVisible(group) {
    switch (group) {
      case 'Sécurité':       return showSec;
      case 'Espace nature':  return showNature;
      case 'Régie':          return showRegie;
      case 'Propreté':       return showProprete;
      case 'Maintenance':    return showMaintenance;
      case 'Culture':        return showCulture;
      case 'Accueil':        return showAccueil;
      case 'Médiation':      return showMediation;
      case 'Restauration':   return showRestauration;
      case 'Commercial':     return showCommercial;
      case 'Autre':          return showAutre;
      case 'Ne sait pas':
      default:
        return showUnknown;
    }
  }

  // Je crée une copie pour trier sans toucher au tableau original
  const sorted = [...points];

  // Tri suivant le critère sélectionné (currentSort)
  if (currentSort === 'urgency') {
    // D'abord par urgence (du plus urgent au moins urgent), puis par date de création
    sorted.sort((a, b) => {
      const rDiff = urgencyRank(b.urgency) - urgencyRank(a.urgency);
      if (rDiff !== 0) return rDiff;
      return a.createdAt - b.createdAt;
    });
  } else if (currentSort === 'date_desc') {
    // Plus récents d'abord
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  } else if (currentSort === 'date_asc') {
    // Depuis le plus longtemps
    sorted.sort((a, b) => a.createdAt - b.createdAt);
  } else if (currentSort === 'group') {
    // Tri alphabétique par groupe, puis par date
    sorted.sort((a, b) => {
      const gA = (a.group || '').toLowerCase();
      const gB = (b.group || '').toLowerCase();
      if (gA < gB) return -1;
      if (gA > gB) return 1;
      return a.createdAt - b.createdAt;
    });
  }

  // Construction du HTML de la liste
  let html = '<ul>';

  sorted.forEach(p => {
    const groupRaw = p.group || 'Ne sait pas';

    // Si le groupe du point est filtré, on le saute
    if (!isGroupVisible(groupRaw)) return;

    const color = getUrgencyColor(p.urgency);
    const elapsed = formatElapsed(p.createdAt);
    const group = escapeHtml(groupRaw);
    const locationText = escapeHtml(getLocationLabel(p));

    const hasCoords =
      (p.locationType !== 'plan' &&
       typeof p.lat === 'number' &&
       typeof p.lng === 'number');

    // Bouton "Y aller" uniquement si le point a des coordonnées GPS
    const goBtnHtml = hasCoords
      ? `<button onclick="goToPoint(${p.id})">Y aller</button>`
      : '';

    // Gestion des miniatures de photos sous le point
    let photosHtml = '';
    if (p.photos && p.photos.length > 0) {
      const thumbs = p.photos.map((ph, idx) =>
        `<img src="${ph.data}" alt="${escapeHtml(ph.name)}"
              onclick="openPhoto(${p.id}, ${idx})">`
      ).join('');
      photosHtml = `<div class="point-photos-list">${thumbs}</div>`;
    }

    html += `
      <li>
        [#${p.id}] ${escapeHtml(p.title)}
        <span style="color:${color}; font-weight:600;"> (● ${escapeHtml(p.urgency)})</span>
        – ${group}
        – ${locationText}
        – ${escapeHtml(p.description)}
        – Il y a : ${elapsed}
        <button onclick="focusOnPoint(${p.id})">Voir</button>
        ${goBtnHtml}
        <button onclick="deletePoint(${p.id})">Supprimer</button>
        ${photosHtml}
      </li>
    `;
  });

  html += '</ul>';
  container.innerHTML = html;
}


// ---------- RENDU LISTE DES POINTS SUPPRIMÉS (historique) ----------

/**
 * Met à jour la liste "Historique des points supprimés".
 * But : garder une trace de ce qui a été fait, combien de temps ça a duré, etc.
 */
function renderDeletedList() {
  const container = document.getElementById('deleted-list');

  if (deletedPoints.length === 0) {
    container.innerHTML = '<p>Aucun point supprimé pour le moment.</p>';
    return;
  }

  let html = '<ul>';

  deletedPoints.forEach(p => {
    const created = p.createdAt.toLocaleString();
    const deleted = p.deletedAt.toLocaleString();
    const duration = formatDuration(p.createdAt, p.deletedAt);
    const color = getUrgencyColor(p.urgency);

    const commentsCount = (p.comments || []).length;
    const photosCount = (p.photos || []).length;

    const group = p.group ? escapeHtml(p.group) : 'Non renseigné';
    const locationText = escapeHtml(getLocationLabel(p));

    html += `
      <li>
        <strong>[#${p.id}] ${escapeHtml(p.title)}</strong>
        <span style="color:${color}; font-weight:600;"> (● ${escapeHtml(p.urgency)})</span><br>
        <b>Groupe :</b> ${group}<br>
        <b>Localisation :</b> ${locationText}<br>
        ${escapeHtml(p.description)}<br>
        ${commentsCount} commentaire(s) – ${photosCount} photo(s)<br>
        Créé : ${created} – Supprimé : ${deleted} (resté ${duration})
      </li>
    `;
  });

  html += '</ul>';
  container.innerHTML = html;
}


// ---------- ACTIONS SUR LES POINTS (voir, supprimer, commenter, etc.) ----------

/**
 * Met le focus sur un point :
 * - soit sur un plan (on change de vue, on surligne le marqueur et on affiche le popup)
 * - soit sur la carte (on centre la carte et on ouvre la popup Leaflet)
 */
function focusOnPoint(id) {
  const p = points.find(pt => pt.id === id);
  if (!p) return;

  // Cas des points sur plan (image)
  if (p.locationType === 'plan') {
    const idx = typeof p.planIndex === 'number' ? p.planIndex : 0;

    // On passe à la vue plan correspondante
    currentViewIndex = idx + 1;
    updateView();

    // Animation rapide sur le marqueur pour qu’il ressorte visuellement
    if (p.planMarker) {
      p.planMarker.classList.add('plan-marker-highlight');
      setTimeout(() => {
        if (p.planMarker) {
          p.planMarker.classList.remove('plan-marker-highlight');
        }
      }, 1200);
    }

    // On affiche aussi le popup de plan à côté du marqueur
    showPlanPopupForPoint(p);

  } else {
    // Cas des points sur la carte
    hidePlanPopup(); // Je ferme le popup plan s'il était ouvert

    // Si on n'est pas sur la vue "carte", on y revient
    if (currentViewIndex !== 0) {
      currentViewIndex = 0;
      updateView();
    }

    // On centre la carte sur le point si on a des coordonnées
    if (typeof p.lat === 'number' && typeof p.lng === 'number') {
      map.setView([p.lat, p.lng], 18);
    }

    // Et on ouvre la popup Leaflet si elle existe
    if (p.marker) p.marker.openPopup();
  }
}

/**
 * Ouvre un itinéraire Google Maps vers le point choisi (mode piéton).
 * Utilisé depuis le bouton "Y aller".
 */
function goToPoint(id) {
  const p = points.find(pt => pt.id === id);
  if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') {
    alert("Impossible d'ouvrir l'itinéraire : ce point n'a pas de coordonnées GPS.");
    return;
  }

  const lat = p.lat;
  const lng = p.lng;

  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  window.open(url, '_blank');
}

/**
 * Supprime un point :
 * - enlève le marqueur de la carte / du plan
 * - le bascule dans deletedPoints avec une date de suppression
 * - met à jour les listes et sauvegarde
 */
function deletePoint(id) {
  const index = points.findIndex(pt => pt.id === id);
  if (index === -1) return;

  const point = points[index];
  const deletedAt = new Date();

  if (typeof db !== 'undefined') {
    const baseData = {
      id: point.id,
      title: point.title,
      description: point.description,
      urgency: point.urgency,
      group: point.group || 'Ne sait pas',
      locationType: point.locationType || 'map',
      lat: point.lat,
      lng: point.lng,
      planIndex: point.planIndex,
      relX: point.relX,
      relY: point.relY,
      createdAt: point.createdAt.toISOString(),
      deletedAt: deletedAt.toISOString(),
      comments: (point.comments || []).map(c => ({
        text: c.text,
        createdAt: c.createdAt.toISOString()
      })),
      photos: (point.photos || []).map(ph => ({
        name: ph.name,
        data: ph.data
      }))
    };

    // 1) on ajoute dans la collection des supprimés
    db.collection('deletedPoints').doc(String(id)).set(baseData)
      .catch(err => console.error('Erreur Firestore deletedPoints', err));

    // 2) on supprime de la collection des points actifs
    db.collection('points').doc(String(id)).delete()
      .catch(err => console.error('Erreur Firestore delete point', err));
  } else {
    // Ancien comportement local
    if (point.marker && map.hasLayer(point.marker)) {
      map.removeLayer(point.marker);
    }
    if (point.planMarker && point.planMarker.parentNode) {
      point.planMarker.parentNode.removeChild(point.planMarker);
    }
    point.deletedAt = deletedAt;
    deletedPoints.push(point);
    points.splice(index, 1);

    renderPointsList();
    renderDeletedList();
    saveState();
    hidePlanPopup();
  }
}

/**
 * Ajoute un commentaire à un point (via un simple prompt pour l'instant).
 * Met à jour les popups, la liste et sauvegarde.
 */
function addComment(id) {
  const p = points.find(pt => pt.id === id);
  if (!p) return;

  const text = prompt("Votre commentaire :");
  if (!text) return;

  if (!p.comments) p.comments = [];

  p.comments.push({
    text: text.trim(),
    createdAt: new Date()
  });

  // On met à jour la popup Leaflet si le point est sur la carte
  if (p.marker) {
    p.marker.setPopupContent(buildPopupHtml(p));
  }

  // Et la popup plan si le point est sur un plan
  if (p.locationType === 'plan') {
    showPlanPopupForPoint(p);
  }

  renderPointsList();
  saveState();
}


// ---------- LECTURE DES PHOTOS (FileReader) ----------

/**
 * Lit jusqu’à 5 photos depuis un FileList (input type="file") et renvoie
 * un tableau d'objets { name, data } via un callback.
 * data = base64 prêt à être affiché dans un <img>.
 */
function readPhotosFromInput(fileList, callback) {
  const files = Array.from(fileList || []);
  if (files.length === 0) {
    callback([]);
    return;
  }

  // Je limite volontairement à 5 photos pour éviter les abus
  const limitedFiles = files.slice(0, 5);
  let remaining = limitedFiles.length;
  const photos = [];

  limitedFiles.forEach(file => {
    const reader = new FileReader();

    reader.onload = e => {
      photos.push({
        name: file.name,
        data: e.target.result
      });
      remaining--;
      if (remaining === 0) callback(photos);
    };

    reader.onerror = () => {
      remaining--;
      if (remaining === 0) callback(photos);
    };

    reader.readAsDataURL(file);
  });
}


// ---------- CRÉATION DE POINT ----------

/**
 * Crée un point à partir des infos saisies dans la modale
 * + de la position en attente (pendingLocation).
 * Gère les 2 types de localisation : carte (lat/lng) et plan (relX/relY).
 */
function createPoint(title, description, urgency, group, photos) {
  if (!pendingLocation) return;

  const id = pointIdCounter++;
  const createdAt = new Date();

  const basePointData = {
    id,
    title,
    description,
    urgency,
    group,
    createdAt: createdAt.toISOString(),
    comments: [],
    photos: photos || []
  };

  let dataToSave;

  if (pendingLocation.type === 'plan') {
    dataToSave = {
      ...basePointData,
      locationType: 'plan',
      planIndex: pendingLocation.planIndex,
      relX: pendingLocation.relX,
      relY: pendingLocation.relY
    };
  } else {
    dataToSave = {
      ...basePointData,
      locationType: 'map',
      lat: pendingLocation.lat,
      lng: pendingLocation.lng
    };
  }

  // Si Firestore est dispo → on sauvegarde côté serveur
  if (typeof db !== 'undefined') {
    db.collection('points').doc(String(id)).set(dataToSave)
      .catch(err => {
        console.error('Erreur Firestore createPoint', err);
        alert("Erreur lors de l'enregistrement du point sur le serveur.");
      });
  } else {
    // Fallback ancien comportement local si jamais Firebase n'est pas dispo
    const point = {
      id,
      title,
      description,
      urgency,
      group,
      createdAt,
      comments: [],
      photos: photos || [],
      ...pendingLocation.type === 'plan'
        ? {
            locationType: 'plan',
            planIndex: pendingLocation.planIndex,
            relX: pendingLocation.relX,
            relY: pendingLocation.relY
          }
        : {
            locationType: 'map',
            lat: pendingLocation.lat,
            lng: pendingLocation.lng
          }
    };

    attachMarkerToPoint(point);
    points.push(point);
    renderPointsList();
    saveState();
    applyVisibilityFilter();
  }
}



// ---------- ÉCOUTEURS SUR LA CARTE & LA MODALE ----------

// Clic sur la carte → ouverture de la modale de création de point
map.on('click', e => {
  if (currentViewIndex !== 0) return; // sécurité : seulement en vue "carte"
  openModalForMap(e.latlng);
});

// Bouton "Annuler" de la modale
cancelBtn.addEventListener('click', () => {
  closeModal();
});

// Bouton "Créer" de la modale
createBtn.addEventListener('click', () => {
  if (!pendingLocation) {
    closeModal();
    return;
  }

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const urgency = urgencySelect.value;
  const group = groupSelect.value;

  if (!title || !description) {
    alert("Merci de remplir le titre et la description.");
    return;
  }

  // Lecture éventuelle des photos avant de créer le point
  readPhotosFromInput(photosInput.files, photos => {
    createPoint(title, description, urgency, group, photos);
    closeModal();
  });
});

// Boutons Export / Import des données
if (exportBtn) {
  exportBtn.addEventListener('click', exportData);
}

if (importBtn && importFileInput) {
  importBtn.addEventListener('click', () => {
    // Je reset la valeur pour pouvoir ré-importer deux fois le même fichier si besoin
    importFileInput.value = '';
    importFileInput.click();
  });

  importFileInput.addEventListener('change', handleImportFile);
}
