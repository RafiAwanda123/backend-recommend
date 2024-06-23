require('dotenv').config();
const axios = require('axios');

const getUserLocation = async (req, lat, lon) => {
    try {
        // Jika lat dan lon disediakan, kembalikan lokasi pengguna menggunakan nilai yang diberikan
        if (lat && lon) {
            return { lat, lon };
        }

        // Jika lat dan lon tidak disediakan, lakukan panggilan ke Geolocation API
        const response = await axios.post('https://www.googleapis.com/geolocation/v1/geolocate', {}, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}` 
            }
        });

        if (response.status === 200) {
            const { lat, lng } = response.data.location;
            return { lat, lon: lng };
        } else {
            console.error('Failed to fetch user location:', response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error fetching user location:', error);
        return null;
    }
};


module.exports = {getUserLocation};