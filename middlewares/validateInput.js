const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({
            error: true,
            message: `"${firstError.param}" ${firstError.msg}`
        });
    }
    next();
};

const validateSignup = [
    body('username').notEmpty().withMessage('is required'),
    body('email').isEmail().withMessage('is required'),
    body('password')
        .isLength({ min: 8 }).withMessage('must be at least 8 characters long')
        .matches(/[A-Z]/).withMessage('must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('must contain at least one number'),
    handleValidationErrors
];

const validateLogin = [
    body('email').isEmail().withMessage('is required'),
    body('password').notEmpty().withMessage('is required'),
    handleValidationErrors
];

module.exports = { validateSignup, validateLogin };
