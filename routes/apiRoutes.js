const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const verifyToken = require('../middlewares/verifyToken');

router.get('/destination', verifyToken, apiController.getDestinationByCoordinates);
router.get('/review', verifyToken, apiController.getReviewsByDestinationId);
router.post('/addreview', verifyToken, apiController.addReview);
router.get('/import-destinations', verifyToken, apiController.importDestinations);
router.get('/nearby-destinations', verifyToken, apiController.getNearbyDestinations);

module.exports = router;
