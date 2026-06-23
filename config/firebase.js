const admin = require('firebase-admin');

// The full service account JSON is stored as a single-line string in the
// FIREBASE_SERVICE_ACCOUNT_JSON env var (Firebase Console -> Project Settings
// -> Service Accounts -> Generate new private key).
function initFirebase() {
  if (admin.apps.length) return admin;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT_JSON env var. Firebase auth will not work until this is set.');
    return admin;
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  return admin;
}

module.exports = initFirebase();
