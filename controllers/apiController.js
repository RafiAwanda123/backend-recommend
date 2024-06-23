const { Firestore } = require('@google-cloud/firestore');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { updateDestinations } = require('../services/importService');
const {db} = require('../config/firebaseConfig');
const calculateDistance = require('../utils/haversine');
const {getUserLocation} = require('../services/myLocation');
const axios = require('axios');
require('dotenv').config();

const firestore = new Firestore();
const client = new PredictionServiceClient();

const getDestinationByCoordinates = async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({
            error: true,
            message: "Invalid latitude or longitude"
        });
    }

    // Ambil data dari Firestore
    try {
        const querySnapshot = await firestore.collection('destinations')
            .where('lat', '==', lat)
            .where('lon', '==', lon)
            .get();

        if (querySnapshot.empty) {
            return res.status(404).json({
                error: true,
                message: "Destination not found"
            });
        }

        const destination = querySnapshot.docs[0].data();

        return res.status(200).json({
            error: false,
            message: "Destination fetched successfully",
            listDestinations: [destination]
        });
    } catch (error) {
        console.error("Error getting destination from Firestore:", error);
        return res.status(500).json({
            error: true,
            message: "Failed to fetch destination from Firestore"
        });
    }
};

const getReviewsByDestinationId = async (req, res) => {
    const destination_id = req.query.destination_id;

    if (!destination_id) {
        console.log("No destination_id in request body"); // Log jika destination_id tidak ada
        return res.status(400).json({
            error: true,
            message: "destination_id is required"
        });
    }

    console.log("Destination ID:", destination_id); // Log untuk memeriksa destination_id

    try {
        const destinationDocRef = firestore.collection('destinations').doc(destination_id);
        const destinationDoc = await destinationDocRef.get();
        
        if (!destinationDoc.exists) {
            console.log("Destination not found for ID:", destination_id); // Log jika dokumen tidak ditemukan
            return res.status(404).json({
                error: true,
                message: "Destination not found"
            });
        }

        const destination = destinationDoc.data(); // Mengakses data dokumen dengan benar
        console.log("Destination Data:", destination); // Log untuk memeriksa data dokumen

        if (!destination.reviews || destination.reviews.length === 0) {
            console.log("No reviews found in destination data"); // Log jika field reviews tidak ada
            return res.status(404).json({
                error: true,
                message: "No reviews found for this destination"
            });
        }

        // Menghitung rata-rata rating dari semua reviews
        let totalRating = 0;
        destination.reviews.forEach(review => {
            totalRating += review.rating;
        });
        const averageRating = totalRating / destination.reviews.length;

        // Memperbarui rating destinasi dengan rata-rata rating baru
        await destinationDocRef.update({
            rating: parseFloat(averageRating.toFixed(1)) 
        });

        return res.status(200).json({
            error: false,
            message: "Reviews fetched successfully",
            listReviews: destination.reviews,
            averageRating: parseFloat(averageRating.toFixed(1)) 
        });
    } catch (error) {
        console.error("Error fetching reviews from Firestore:", error); // Log untuk error
        return res.status(500).json({
            error: true,
            message: "Failed to fetch reviews from Firestore"
        });
    }
};

const addReview = async (req, res) => {
    try {
        console.log("Memulai addReview, req.user:", req.user);

        const { destination_id, review, rating } = req.body;

        // Validasi dan konversi rating
        const parsedRating = parseInt(rating, 10);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({
                error: true,
                message: "Invalid rating. Rating should be an integer between 1 and 5."
            });
        }

        // Ambil dokumen destinasi dari Firestore
        const destinationDocRef = firestore.collection('destinations').doc(destination_id);
        const destinationDoc = await destinationDocRef.get();

        if (!destinationDoc.exists) {
            return res.status(404).json({
                error: true,
                message: "Destination not found"
            });
        }

        const destinationData = destinationDoc.data();

        // Validasi req.user dan req.user.name
        const reviewer_name = req.user && req.user.name ? req.user.name : "Anonymous";
        console.log("Reviewer Name:", reviewer_name);

        // Buat objek review baru untuk destinasi
        const newDestinationReview = {
            reviewer_name: reviewer_name,
            review: review,
            rating: parsedRating,
            createdAt: new Date().toISOString()
        };

        // Tambahkan review ke destinasi
        if (!destinationData.reviews) {
            destinationData.reviews = [];
        }
        destinationData.reviews.push(newDestinationReview);

        // Perbarui rating_count
        const ratingCount = destinationData.reviews.length;

        // Hitung total rating
        let totalRating = 0;
        destinationData.reviews.forEach(review => {
            totalRating += review.rating;
        });
        const averageRating = totalRating / ratingCount;

        // Simpan data destinasi ke Firestore
        await destinationDocRef.set({
            ...destinationData,
            rating_count: ratingCount,
            average_rating: averageRating
        }, { merge: true });

        console.log("Review successfully added to destination");

        // Jika pengguna masuk, tambahkan review ke profil pengguna
        if (req.user) {
            const userDocRef = firestore.collection('users').doc(req.user.email);
            const userDoc = await userDocRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();

                // Buat objek review baru untuk pengguna
                const newUserReview = {
                    review: review,
                    rating: parsedRating,
                    category: destinationData.category,
                    destination_id: destinationData.destination_id // Mengambil kategori dari data destinasi
                };

                // Tambahkan review ke profil pengguna
                if (!userData.reviews) {
                    userData.reviews = [];
                }
                userData.reviews.push(newUserReview);

                // Simpan data pengguna ke Firestore
                await userDocRef.set(userData, { merge: true });
                console.log("User profile updated with new review");
            } else {
                console.log("User not found in database");
            }
        }

        // Kirim respons berhasil
        return res.status(201).json({
            error: false,
            message: "Review added successfully"
        });
    } catch (error) {
        console.error("Error adding review:", error);
        return res.status(500).json({
            error: true,
            message: "Failed to add review"
        });
    }
};

const importDestinations = async (req, res) => {
    try {
        await updateDestinations();
        res.status(200).json({ error: false, message: "Data imported successfully" });
    } catch (error) {
        res.status(500).json({ error: true, message: "Failed to import data" });
    }
};

const getNearbyDestinations = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const userId = req.user && req.user.id;

        if (!lat || !lon) {
            return res.status(400).send({ error: 'Latitude and longitude are required' });
        }

        if (!userId) {
            return res.status(400).send({ error: 'User ID is required' });
        }

        const userLocation = {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
        };

        const radius = 30; // Radius dalam kilometer
        const destinationsRef = firestore.collection('destinations');
        const snapshot = await destinationsRef.get();

        if (snapshot.empty) {
            return res.status(200).json({
                error: false,
                message: "Tidak ada destinasi yang ditemukan",
                listDestinations: []
            });
        }

        const userDocRef = firestore.collection('users').doc(userId);
        const userDoc = await userDocRef.get();
        const userData = userDoc.exists ? userDoc.data() : null;

        let nearbyDestinations = [];
        if (userData && userData.reviews && userData.reviews.length > 0) {
            const userReviews = userData.reviews.map(review => ({
                destination_id: review.destination_id,
                rating: review.rating,
                category: review.category
            }));

            const instances = userReviews.map(review => ({
                destination_id: review.destination_id,
                rating: review.rating,
                category: review.category
            }));

            const endpointUrl = process.env.ENDPOINT_URL;
            //const accessToken = process.env.ACCESS_TOKEN;
            const project = process.env.FIRESTORE_PROJECT_ID;
            const location = process.env.LOCATION;
            const endpointId = process.env.ENDPOINT_ID;

            const request = {
                endpoint: client.endpointPath(project, location, endpointId),
                instances: instances
            };

            const [response] = await client.predict(request);
            const predictions = response.predictions;

            snapshot.forEach((doc, index) => {
                const destination = doc.data();
                if (predictions[index] > 0.5) { // Ambang batas rekomendasi
                    nearbyDestinations.push({ id: doc.id, ...destination, prediction: predictions[index] });
                }
            });

            nearbyDestinations.sort((a, b) => b.prediction - a.prediction);
        } else {
            snapshot.forEach(doc => {
                const destination = doc.data();
                const destinationLocation = {
                    lat: destination.lat,
                    lon: destination.lon
                };

                const distance = calculateDistance(userLocation, destinationLocation);
                if (distance <= radius) {
                    nearbyDestinations.push({ id: doc.id, ...destination, distance });
                }
            });

            nearbyDestinations.sort((a, b) => {
                if (b.average_rating !== a.average_rating) {
                    return b.average_rating - a.average_rating;
                } else {
                    return a.distance - b.distance;
                }
            });
        }

        return res.status(200).json({
            error: false,
            message: "Destinasi berhasil diambil",
            listDestinations: nearbyDestinations
        });

    } catch (error) {
        console.error('Error getting nearby destinations:', error);
        return res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
};

// const addBookmark = async (req, res) => {
//     const userId = req.user && req.user.id; 
//     const destinationId = req.body.destination_id;

//     if (!userId) {
//         return res.status(401).json({
//             error: true,
//             message: "Unauthorized"
//         });
//     }

//     if (!destinationId) {
//         return res.status(400).json({
//             error: true,
//             message: "Destination ID is required"
//         });
//     }

//     try {
//         const userRef = firestore.collection('users').doc(userId);
//         const bookmarkRef = userRef.collection('bookmarks').doc(destinationId);

//         // Cek apakah destinasi sudah ada di bookmark
//         const bookmarkDoc = await bookmarkRef.get();
//         if (bookmarkDoc.exists) {
//             return res.status(400).json({
//                 error: true,
//                 message: "Destination already bookmarked"
//             });
//         }

//         // Ambil data destinasi dari Firestore
//         const destinationDocRef = firestore.collection('destinations').doc(destinationId);
//         const destinationDoc = await destinationDocRef.get();

//         if (!destinationDoc.exists) {
//             return res.status(404).json({
//                 error: true,
//                 message: "Destination not found"
//             });
//         }

//         const destinationData = destinationDoc.data();

//         // Simpan destinasi ke bookmark pengguna
//         await bookmarkRef.set({
//             ...destinationData,
//             bookmarkedAt: new Date().toISOString()
//         });

//         return res.status(201).json({
//             error: false,
//             message: "Destination bookmarked successfully"
//         });
//     } catch (error) {
//         console.error("Error adding bookmark:", error);
//         return res.status(500).json({
//             error: true,
//             message: "Failed to add bookmark"
//         });
//     }
// };


// const removeBookmark = async (req, res) => {
//     const userId = req.user && req.user.uid; // Pastikan Anda memiliki userId dari autentikasi
//     const destinationId = req.body.destination_id;

//     if (!userId) {
//         return res.status(401).json({
//             error: true,
//             message: "Unauthorized"
//         });
//     }

//     if (!destinationId) {
//         return res.status(400).json({
//             error: true,
//             message: "Destination ID is required"
//         });
//     }

//     try {
//         const userRef = firestore.collection('users').doc(userId);
//         const bookmarkRef = userRef.collection('bookmarks').doc(destinationId);

//         // Cek apakah destinasi ada di bookmark
//         const bookmarkDoc = await bookmarkRef.get();
//         if (!bookmarkDoc.exists) {
//             return res.status(404).json({
//                 error: true,
//                 message: "Destination not bookmarked"
//             });
//         }

//         // Hapus destinasi dari bookmark
//         await bookmarkRef.delete();

//         return res.status(200).json({
//             error: false,
//             message: "Destination removed from bookmarks successfully"
//         });
//     } catch (error) {
//         console.error("Error removing bookmark:", error);
//         return res.status(500).json({
//             error: true,
//             message: "Failed to remove bookmark"
//         });
//     }
// };

module.exports = {
    getDestinationByCoordinates,
    getReviewsByDestinationId,
    addReview,
    importDestinations,
    getNearbyDestinations,
    // removeBookmark,
    // addBookmark
};
    