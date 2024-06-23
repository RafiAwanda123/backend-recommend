const express = require('express');
const { validateSignup, validateLogin } = require('../middlewares/validateInput');
const { signUp, login } = require('../controllers/authController');
const router = express.Router();

router.post('/signup', validateSignup, signUp);
router.post('/login', validateLogin, login);


module.exports = router;
