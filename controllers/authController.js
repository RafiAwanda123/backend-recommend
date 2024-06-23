const argon2 = require('argon2');
const { admin, db, bucket } = require('../config/firebaseConfig');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');

// Function to handle validation errors
const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            error: true,
            message: `"${firstError.param}" ${firstError.msg}`
        });
    }
    return null; // return null if no validation errors
};

const signUp = async (req, res) => {
    // Handle validation errors
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError; // Return validation error if exists

    const { username, email, password } = req.body;

    try {
        console.log('Memeriksa apakah pengguna sudah ada...');
        const userRef = db.collection('users').doc(email);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            console.log('Pengguna sudah ada.');
            return res.status(400).json({ error: true, message: 'Email sudah ada' });
        }

        console.log('Meng-hash password...');
        const hashedPassword = await argon2.hash(password);

        console.log('Membuat pengguna di Firebase Authentication...');
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: username,
        });

        console.log('Menyimpan pengguna ke Firestore...');
        await userRef.set({
            username,
            email,
            password: hashedPassword,
            uid: userRecord.uid
        });

        // Buat objek user untuk generateToken
        const user = {
            id: userRecord.uid,
            name: username,
            email: email
        };

        const token = generateToken(user);
        console.log('Pengguna berhasil dibuat.');
        return res.status(201).json({
            error: false,
            message: 'Pengguna dibuat',
            username,
            token,
            id: userRecord.uid
        });
    } catch (error) {
        console.error('Kesalahan selama pendaftaran:', error);  // Logging error
        return res.status(500).json({ error: true, message: error.message });
    }
};

const login = async (req, res) => {
    // Handle validation errors
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError; // Return validation error if exists

    const { email, password } = req.body;

    try {
        console.log('Memeriksa apakah pengguna ada...');
        const userRef = db.collection('users').doc(email);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log('Pengguna tidak ditemukan.');
            return res.status(400).json({ error: true, message: 'Kredensial tidak valid' });
        }

        const userData = userDoc.data();
        console.log('Memverifikasi password...');
        const isMatch = await argon2.verify(userData.password, password);

        if (!isMatch) {
            console.log('Password tidak cocok.');
            return res.status(400).json({ error: true, message: 'Kredensial tidak valid' });
        }

        // Buat objek user untuk generateToken
        const user = {
            id: userData.uid, // pastikan ini sesuai dengan field yang ada di Firestore
            name: userData.username,
            email: userData.email
        };

        const token = generateToken(user);
        console.log('Pengguna berhasil masuk.');
        return res.status(200).json({
            error: false,
            message: 'Berhasil',
            loginResult: {
                userId: user.id,
                name: user.name,
                token
            }
        });
    } catch (error) {
        console.error('Kesalahan selama masuk:', error);  // Logging error
        return res.status(500).json({ error: true, message: error.message });
    }
};

module.exports = { signUp, login };
