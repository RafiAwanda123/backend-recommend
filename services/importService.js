const { firestore, db, admin} = require('../config/firebaseConfig');
// const { Storage } = require('@google-cloud/storage');
// const csv = require('csv-parser');

async function updateDestinations() {
  try {
    const destinationsRef = firestore.collection('destinations');
    const snapshot = await destinationsRef.get();

    const batch = firestore.batch();

    snapshot.forEach((doc) => {
      const destinationData = doc.data();
      const destinationId = doc.id;

      // Update photoUrl and url_maps
      const photoUrl = `https://storage.googleapis.com/tourbuddy-dataset/assets-gambar/${destinationData.destination_id}.jpg`;
      const mapsUrl = `https://maps.google.com/?q=${destinationData.lat},${destinationData.lon}`;

      // Get the number of reviews
      const reviews = destinationData.reviews || [];
      const ratingCount = reviews.length;

      batch.update(destinationsRef.doc(destinationId), {
        photoUrl: photoUrl,
        url_maps: mapsUrl,
        rating_count: ratingCount
      });
    });

    // Commit the batch
    await batch.commit();

    console.log('Update selesai.');
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  }
}

module.exports = { updateDestinations };
