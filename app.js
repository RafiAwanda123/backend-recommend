const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { updateDestinations } = require('./services/importService');

dotenv.config();  // Ini memuat variabel dari file .env ke process.env

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

updateDestinations().then(() => {
    console.log('Data imported successfully on startup');
}).catch((error) => {
    console.error('Failed to import data on startup', error);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
