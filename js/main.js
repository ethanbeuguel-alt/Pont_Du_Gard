// main.js - Point d'entrée : initialisation de l'application au chargement de la page.

// ---------- INITIALISATION ----------
    loadState();
    renderPointsList();
    renderDeletedList();
    applyVisibilityFilter();
    setInterval(renderPointsList, 10000);

    // Fonctions globales
    window.focusOnPoint = focusOnPoint;
    window.deletePoint = deletePoint;
    window.addComment = addComment;
    window.openPhoto = openPhoto;
    window.changePointGroup = changePointGroup;
