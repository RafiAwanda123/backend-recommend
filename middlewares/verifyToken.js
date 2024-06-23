const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(403).json({ error: true, message: 'Token tidak tersedia' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Log req.user untuk memeriksa informasi pengguna yang diuraikan dari token
        console.log("Informasi pengguna dari token:", req.user);

        next();
    } catch (error) {
        return res.status(403).json({ error: true, message: 'Token tidak valid' });
    }
};

module.exports = verifyToken;
