import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TRIPS_DIR = path.join(process.cwd(), 'trips_db');

// Ensure trips directory exists
if (!fs.existsSync(TRIPS_DIR)) {
    fs.mkdirSync(TRIPS_DIR, { recursive: true });
}

export function saveTripData(app) {
    // Save Trip
    app.post('/api/save-trip', (req, res) => {
        try {
            const tripData = req.body;
            
            // Generate a short unique ID (e.g., 8 chars)
            const id = crypto.randomBytes(4).toString('hex');
            
            const filePath = path.join(TRIPS_DIR, `${id}.json`);
            
            // Add timestamp
            tripData.savedAt = new Date().toISOString();
            
            fs.writeFileSync(filePath, JSON.stringify(tripData, null, 2));
            
            console.log(`💾 Saved new trip to DB: ${id}`);
            res.status(200).json({ success: true, id });
        } catch (error) {
            console.error('Error saving trip:', error);
            res.status(500).json({ error: 'Failed to save trip' });
        }
    });

    // Get Trip
    app.get('/api/trip/:id', (req, res) => {
        try {
            const { id } = req.params;
            const filePath = path.join(TRIPS_DIR, `${id}.json`);
            
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Trip not found' });
            }
            
            const tripData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            res.status(200).json(tripData);
        } catch (error) {
            console.error('Error retrieving trip:', error);
            res.status(500).json({ error: 'Failed to retrieve trip' });
        }
    });
}
