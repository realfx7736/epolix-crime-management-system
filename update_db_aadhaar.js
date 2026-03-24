const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'backend', 'data', 'local_db.json');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// Update Citzen with Aadhaar-linked data
db.users = db.users.map(u => {
    if (u.role === 'citizen') {
        return {
            ...u,
            aadhaar_last4: '1234',
            aadhaar_linked_mobile: '9333333333', // matched to his phone
            is_aadhaar_verified: false
        };
    }
    return u;
});

// Add another citizen whose mobile DOES NOT match (to test failure)
db.users.push({
    name: "Mismatch Citizen",
    email: "mismatch@example.com",
    phone: "9888888888",
    citizenId: "CIT-2026-0002",
    role: "citizen",
    password: "$2b$10$qP/nWoTS1ZRuUKcBueSPFuklf/1ZJCzaJ0DbAEa4pPfpJFusAg00S",
    verified: true,
    is_active: true,
    _id: "citizen_local_2",
    aadhaar_last4: "9999",
    aadhaar_linked_mobile: "9111111111", // different from his phone
    is_aadhaar_verified: false
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log('Local DB updated for Aadhaar testing.');
