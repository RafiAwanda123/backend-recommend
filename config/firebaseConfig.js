const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
require('dotenv').config();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.BUCKET_NAME
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const firestore = admin.firestore();

module.exports = { admin, db, bucket, firestore };
