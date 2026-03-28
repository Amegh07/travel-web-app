import Amadeus from 'amadeus';
import dotenv from 'dotenv';
dotenv.config();
const amadeus = new Amadeus({ clientId: process.env.AMA_ID_1, clientSecret: process.env.AMA_SEC_1 });
amadeus.referenceData.locations.get({ keyword: 'DEL', subType: 'CITY,AIRPORT' })
    .then(r => console.log('\n✅ AMADEUS CONNECTION SUCCESSFUL! Result:', r.data[0].name))
    .catch(e => console.log('\n❌ AMADEUS FAILED:', e.description || e.code || e.message || e));
