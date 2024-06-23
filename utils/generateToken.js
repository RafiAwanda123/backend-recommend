const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    if (!user || !user.id || !user.name || !user.email) {
        throw new Error('Invalid user data for token generation');
    }

    const payload = {
        id: user.id,
        name: user.name,
        email: user.email
    };

    return jwt.sign(payload, process.env.JWT_SECRET);
};

module.exports = generateToken;
