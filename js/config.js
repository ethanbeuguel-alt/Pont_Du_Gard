const firebaseConfig = {
  apiKey: "AIzaSyASQ5qGxSLxYZtzOm1CGZcIHL2BhRh719k",
  authDomain: "pont-du-gard-f8ede.firebaseapp.com",
  projectId: "pont-du-gard-f8ede",
  storageBucket: "pont-du-gard-f8ede.firebasestorage.app",
  messagingSenderId: "557317554606",
  appId: "1:557317554606:web:4e55e5d5cab4cac311083f",
  measurementId: "G-D74DVXV9ZV"
};

// Initialise Firebase (via l’objet global "firebase" fourni par les <script> CDN)
firebase.initializeApp(firebaseConfig);

// Firestore global pour tout le reste du code
window.db = firebase.firestore();
