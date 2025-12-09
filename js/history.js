// history.js - Historique par service + logiques associées (tri, filtrage).
// Ici je gère la partie "Historique par service" (7 derniers jours) + quelques
// comportements globaux liés au tri et aux filtres.

// ---------- HISTORIQUE PAR SERVICE ----------

// Elements du petit module "Historique par service"
const serviceHistoryOverlay = document.getElementById('service-history-overlay');
const serviceHistoryClose = document.getElementById('service-history-close');
const serviceHistoryBtn = document.getElementById('service-history-btn');
const serviceSelect = document.getElementById('service-select');
const serviceHistoryContent = document.getElementById('service-history-content');

/**
 * Formatte une date sous forme "JJ/MM/AAAA à HH:MM"
 * (juste pour quelque chose de lisible dans l'interface).
 */
function formatDateTime(dt) {
  if (!(dt instanceof Date)) return '';
  const d = dt.toLocaleDateString('fr-FR');
  const t = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d + " à " + t;
}

/**
 * Ouvre la fenêtre d’historique par service.
 * Je commence par rafraîchir le contenu, puis j’affiche l’overlay.
 */
function openServiceHistory() {
  updateServiceHistory();
  serviceHistoryOverlay.style.display = 'flex';
}

/**
 * Ferme la fenêtre d’historique par service.
 */
function closeServiceHistory() {
  serviceHistoryOverlay.style.display = 'none';
}

/**
 * Met à jour le contenu de l’historique pour le service sélectionné.
 * - On cherche tous les points (actifs + supprimés) du service choisi
 * - On garde uniquement ceux créés dans les 7 derniers jours
 * - On affiche leur statut (En cours / Traité), l’urgence, l’âge, etc.
 */
function updateServiceHistory() {
  const selectedGroup = serviceSelect.value; // service choisi dans le <select>
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // maintenant - 7 jours

  const items = [];

  // 1) Points encore "en cours" (dans points[])
  if (Array.isArray(points)) {
    points.forEach(p => {
      const group = p.group || 'Ne sait pas';

      // Je filtre sur le groupe choisi + la date de création (dans les 7 derniers jours)
      if (group === selectedGroup && p.createdAt instanceof Date && p.createdAt >= weekAgo) {
        items.push({
          id: p.id,
          title: p.title,
          description: p.description,
          urgency: p.urgency,
          location: getLocationLabel(p),
          createdAt: p.createdAt,
          status: 'En cours',           // pas supprimé → encore en cours
          comments: p.comments || []
        });
      }
    });
  }

  // 2) Points "Traités" (ceux qui sont passés dans deletedPoints[])
  if (Array.isArray(deletedPoints)) {
    deletedPoints.forEach(p => {
      const group = p.group || 'Ne sait pas';

      // Même logique : même service + créé dans les 7 derniers jours
      if (group === selectedGroup && p.createdAt instanceof Date && p.createdAt >= weekAgo) {
        items.push({
          id: p.id,
          title: p.title,
          description: p.description,
          urgency: p.urgency,
          location: getLocationLabel(p),
          createdAt: p.createdAt,
          status: 'Traité',             // ici on considère que le point a été traité
          comments: p.comments || []
        });
      }
    });
  }

  // Je trie du plus récent au plus ancien
  items.sort((a, b) => b.createdAt - a.createdAt);

  // Si aucun item, je mets juste le message vide
  if (items.length === 0) {
    serviceHistoryContent.innerHTML =
      '<p id="service-history-empty">Aucun point pour ce service sur les 7 derniers jours.</p>';
    return;
  }

  // Sinon je construis la liste HTML
  let htmlList = '<ul>';

  items.forEach(it => {
    const commentsCount = it.comments.length;

    // Petite phrase récap sur les commentaires + la date du dernier si dispo
    let commentsInfo = 'Aucun commentaire';
    if (commentsCount > 0) {
      const last = it.comments[commentsCount - 1];
      const lastDate = last && last.createdAt instanceof Date ? last.createdAt : null;
      commentsInfo = commentsCount + " commentaire(s)" +
        (lastDate ? " (dernier : " + formatDateTime(lastDate) + ")" : "");
    }

    // Statut affiché de façon visuelle
    const statusText = it.status === 'Traité' ? '✅ Traité' : '🟡 En cours';

    // Affichage de l’urgence avec sa couleur
    const urgencyLabel =
      `<span style="color:${getUrgencyColor(it.urgency)}">${escapeHtml(it.urgency || '')}</span>`;

    const createdText = formatDateTime(it.createdAt);
    const elapsed = formatElapsed(it.createdAt); // "il y a X h..."

    htmlList += `
      <li>
        [#${it.id}] ${escapeHtml(it.title || '')} (${statusText}) - ${urgencyLabel}<br>
        Créé : ${createdText} (Il y a ${elapsed})<br>
        Commentaires : ${escapeHtml(commentsInfo)}<br>
        Description : ${escapeHtml(it.description || '')}
      </li>
    `;
  });

  htmlList += '</ul>';
  serviceHistoryContent.innerHTML = htmlList;
}

// Ouverture / fermeture de la fenêtre d’historique
serviceHistoryBtn.addEventListener('click', openServiceHistory);
serviceHistoryClose.addEventListener('click', closeServiceHistory);

// Fermeture si on clique en dehors de la boîte (sur l’overlay foncé)
serviceHistoryOverlay.addEventListener('click', (e) => {
  if (e.target === serviceHistoryOverlay) closeServiceHistory();
});

// Changement de service dans la liste déroulante → on met à jour l’historique
serviceSelect.addEventListener('change', updateServiceHistory);


// ---------- TRI & FILTRES GLOBAUX ----------

/**
 * Quand on change le mode de tri (urgence, date, groupe, etc.),
 * je mets à jour currentSort + je re-génère la liste des points.
 */
sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  renderPointsList();
});

/**
 * Pour certains filtres de groupes, je réapplique l’affichage sur la carte
 * (applyVisibilityFilter) + je regénère la liste des points.
 *
 * NB : ici je n’ai branché que quelques filtres (Sécurité, Nature, Régie, Autre, Ne sait pas).
 * On pourrait très bien étendre la liste si besoin, sur le même principe.
 */
[filterSecurite, filterNature, filterRegie, filterAutre, filterUnknown].forEach(cb => {
  cb.addEventListener('change', () => {
    applyVisibilityFilter();
    renderPointsList();
  });
});
