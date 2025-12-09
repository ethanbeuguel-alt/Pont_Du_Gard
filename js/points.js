// points.js - Gestion de l’affichage des points, des actions, et de la création.

// ---------- LISTE DES POINTS ACTIFS ----------

function renderPointsList() {
  const container = document.getElementById('point-list');

  if (points.length === 0) {
    container.innerHTML = '<p>Aucun point pour le moment.</p>';
    return;
  }

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

  const sorted = [...points];

  if (currentSort === 'urgency') {
    sorted.sort((a, b) => {
      const rDiff = urgencyRank(b.urgency) - urgencyRank(a.urgency);
      if (rDiff !== 0) return rDiff;
      return a.createdAt - b.createdAt;
    });
  } else if (currentSort === 'date_desc') {
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  } else if (currentSort === 'date_asc') {
    sorted.sort((a, b) => a.createdAt - b.createdAt);
  } else if (currentSort === 'group') {
    sorted.sort((a, b) => {
      const gA = (a.group || '').toLowerCase();
      const gB = (b.group || '').toLowerCase();
      if (gA < gB) return -1;
      if (gA > gB) return 1;
      return a.createdAt - b.createdAt;
    });
  }

  let html = '<ul>';

  sorted.forEach(p => {
    const groupRaw = p.group || 'Ne sait pas';
    if (!isGroupVisible(groupRaw)) return;

    const color = getUrgencyColor(p.urgency);
    const elapsed = formatElapsed(p.createdAt);
    const group = escapeHtml(groupRaw);
    const locationText = escapeHtml(getLocationLabel(p));

    const hasCoords =
      (p.locationType !== 'plan' &&
       typeof p.lat === 'number' &&
       typeof p.lng === 'number');

    const goBtnHtml = hasCoords
      ? `<button onclick="goToPoint(${p.id})">Y aller</button>`
      : '';

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

// ---------- LISTE DES POINTS SUPPRIMÉS ----------

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

// ---------- ACTIONS SUR LES POINTS ----------

function focusOnPoint(id) {
  const p = points.find(pt => pt.id === id);
  if (!p) return;

  if (p.locationType === 'plan') {
    const idx = typeof p.planIndex === 'number' ? p.planIndex : 0;

    currentViewIndex = idx + 1;
    updateView();

    if (p.planMarker) {
      p.planMarker.classList.add('plan-marker-highlight');
      setTimeout(() => {
        if (p.planMarker) {
          p.planMarker.classList.remove('plan-marker-highlight');
        }
      }, 1200);
    }

    showPlanPopupForPoint(p);

  } else {
    if (typeof hidePlanPopup === 'function') hidePlanPopup();

    if (currentViewIndex !== 0) {
      currentViewIndex = 0;
      updateView();
    }

    if (typeof p.lat === 'number' && typeof p.lng === 'number') {
      map.setView([p.lat, p.lng], 18);
    }

    if (p.marker) p.marker.openPopup();
  }
}

function goToPoint(id) {
  const p = points.find(pt => pt.id === id);
  if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') {
    alert("Impossible d'ouvrir l'itinéraire : ce point n'a pas de coordonnées GPS.");
    return;
  }

  const url = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;
  window.open(url, '_blank');
}

function deletePoint(id) {
  const index = points.findIndex(pt => pt.id === id);
  if (index === -1) return;

  const point = points[index];
  const deletedAt = new Date();

  // Visuel local : on enlève les marqueurs
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
  if (typeof hidePlanPopup === 'function') hidePlanPopup();

  // Synchro Firestore
  if (typeof db !== 'undefined') {
    const baseData = {
      id: point.id,
      title: point.title,
      description: point.description,
      urgency: point.urgency,
      group: point.group || 'Ne sait pas',
      locationType: point.locationType || 'map',
      lat: point.lat ?? null,
      lng: point.lng ?? null,
      planIndex: point.planIndex ?? null,
      relX: point.relX ?? null,
      relY: point.relY ?? null,
      createdAt: point.createdAt instanceof Date
        ? point.createdAt.toISOString()
        : point.createdAt,
      deletedAt: deletedAt.toISOString(),
      comments: (point.comments || []).map(c => ({
        text: c.text,
        createdAt: c.createdAt instanceof Date
          ? c.createdAt.toISOString()
          : c.createdAt
      })),
      photos: (point.photos || []).map(ph => ({
        name: ph.name,
        data: ph.data
      }))
    };

    db.collection('deletedPoints').doc(String(point.id)).set(baseData)
      .catch(err => console.error('Erreur Firestore deletedPoints', err));

    db.collection('points').doc(String(point.id)).delete()
      .catch(err => console.error('Erreur Firestore delete point', err));
  }
}

function addComment(id) {
  const p = points.find(pt => pt.id === id);
  if (!p) return;

  const text = prompt("Votre commentaire :");
  if (!text) return;

  if (!p.comments) p.comments = [];

  const newComment = {
    text: text.trim(),
    createdAt: new Date()
  };

  p.comments.push(newComment);

  if (p.marker) {
    p.marker.setPopupContent(buildPopupHtml(p));
  }
  if (p.locationType === 'plan') {
    showPlanPopupForPoint(p);
  }

  renderPointsList();
  saveState();

  if (typeof db !== 'undefined') {
    db.collection('points').doc(String(p.id)).update({
      comments: p.comments.map(c => ({
        text: c.text,
        createdAt: c.createdAt.toISOString()
      }))
    }).catch(err => console.error('Erreur Firestore addComment', err));
  }
}

// ---------- LECTURE DES PHOTOS ----------

function readPhotosFromInput(fileList, callback) {
  const files = Array.from(fileList || []);
  if (files.length === 0) {
    callback([]);
    return;
  }

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

function createPoint(title, description, urgency, group, photos) {
  if (!pendingLocation) return;

  const id = pointIdCounter++;
  const createdAt = new Date();

  const point = {
    id,
    title,
    description,
    urgency,
    group,
    createdAt,
    comments: [],
    photos: photos || []
  };

  if (pendingLocation.type === 'plan') {
    point.locationType = 'plan';
    point.planIndex = pendingLocation.planIndex;
    point.relX = pendingLocation.relX;
    point.relY = pendingLocation.relY;
  } else {
    point.locationType = 'map';
    point.lat = pendingLocation.lat;
    point.lng = pendingLocation.lng;
  }

  // Affichage et stockage local
  attachMarkerToPoint(point);
  points.push(point);
  renderPointsList();
  saveState();
  applyVisibilityFilter();

  // Synchro Firestore
  if (typeof db !== 'undefined') {
    const dataToSave = {
      id: point.id,
      title: point.title,
      description: point.description,
      urgency: point.urgency,
      group: point.group,
      locationType: point.locationType,
      lat: point.lat ?? null,
      lng: point.lng ?? null,
      planIndex: point.planIndex ?? null,
      relX: point.relX ?? null,
      relY: point.relY ?? null,
      createdAt: createdAt.toISOString(),
      comments: [],
      photos: (point.photos || []).map(ph => ({
        name: ph.name,
        data: ph.data
      }))
    };

    db.collection('points').doc(String(point.id)).set(dataToSave)
      .catch(err => console.error('Erreur Firestore createPoint', err));
  }
}

// ---------- ÉCOUTEURS CARTE & MODALE ----------

map.on('click', e => {
  if (currentViewIndex !== 0) return;
  openModalForMap(e.latlng);
});

cancelBtn.addEventListener('click', () => {
  closeModal();
});

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

  readPhotosFromInput(photosInput.files, photos => {
    createPoint(title, description, urgency, group, photos);
    closeModal();
  });
});

if (exportBtn) {
  exportBtn.addEventListener('click', exportData);
}

if (importBtn && importFileInput) {
  importBtn.addEventListener('click', () => {
    importFileInput.value = '';
    importFileInput.click();
  });

  importFileInput.addEventListener('change', handleImportFile);
}
