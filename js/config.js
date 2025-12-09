// js/config.js

const firebaseConfig = {
  apiKey: "AIzaSyASQ5qGxSLxYZtzOm1CGZcIHL2BhRh719k",
  authDomain: "pont-du-gard-f8ede.firebaseapp.com",
  projectId: "pont-du-gard-f8ede",
  storageBucket: "pont-du-gard-f8ede.firebasestorage.app",
  messagingSenderId: "557317554606",
  appId: "1:557317554606:web:4e55e5d5cab4cac311083f",
  measurementId: "G-D74DVXV9ZV"
};

console.log("CONFIG.JS CHARGÉ");

// 1) vérifier que firebase existe
console.log("typeof firebase :", typeof firebase);

// 2) vérifier que firestore est bien présent
console.log("typeof firebase.firestore :", typeof firebase.firestore);

// 3) init Firebase
firebase.initializeApp(firebaseConfig);

// 4) créer db
window.db = firebase.firestore ? firebase.firestore() : undefined;

console.log("DB DÉFINI ?", typeof window.db);
