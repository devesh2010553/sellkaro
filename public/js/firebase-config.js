// ============================================================
// FIREBASE CLIENT CONFIG
// Replace the values below with your own Firebase project config
// (Firebase Console -> Project Settings -> General -> Your apps -> Web app)
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDE4fEeABu_m8vVFyhOAISdMnz3KGlS-Rc",
  authDomain: "vertex-2d145.firebaseapp.com",
  projectId: "vertex-2d145",
  storageBucket: "vertex-2d145.firebasestorage.app",
  messagingSenderId: "628055020171",
  appId: "1:628055020171:web:0fe92aed4cf86f3416fa8e",
  measurementId: "G-PL3R9JWYN4"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
