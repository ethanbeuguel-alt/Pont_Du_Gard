// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyASQ5qGxSLxYZtzOm1CGZcIHL2BhRh719k",
  authDomain: "pont-du-gard-f8ede.firebaseapp.com",
  projectId: "pont-du-gard-f8ede",
  storageBucket: "pont-du-gard-f8ede.firebasestorage.app",
  messagingSenderId: "557317554606",
  appId: "1:557317554606:web:4e55e5d5cab4cac311083f",
  measurementId: "G-D74DVXV9ZV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
