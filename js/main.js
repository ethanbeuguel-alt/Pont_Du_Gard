// main.js - Point d'entrée

function initApp() {
  // 1) On recharge ce qu'il y a en local (localStorage)
  loadState();

  // 2) Si Firestore est dispo, on synchronise avec la base partagée
  if (typeof db !== 'undefined' && typeof loadFromFirestore === 'function') {
    loadFromFirestore().then(() => {
      renderPointsList();
      renderDeletedList();
      applyVisibilityFilter();
    }).catch(err => {
      console.error('Erreur init Firestore, on reste en localStorage', err);
      renderPointsList();
      renderDeletedList();
      applyVisibilityFilter();
    });
  } else {
    renderPointsList();
    renderDeletedList();
    applyVisibilityFilter();
  }

  // Rafraîchissement périodique de la liste (durée affichée "il y a X min")
  setInterval(renderPointsList, 10000);

  // Fonctions globales utilisées dans le HTML (onclick)
  window.focusOnPoint = focusOnPoint;
  window.deletePoint = deletePoint;
  window.addComment = addComment;
  window.openPhoto = openPhoto;
  window.changePointGroup = changePointGroup; // définie dans utils.js
}

initApp();
