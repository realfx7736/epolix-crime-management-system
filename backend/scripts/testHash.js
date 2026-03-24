const bcrypt = require('bcryptjs');
(async () => {
    const hash = await bcrypt.hash('password123', 10);
    const match = await bcrypt.compare('admin123', '$2b$10$fgkMKU4UXM9r8m/ershI7u58hkzM6wRD7bESdNyBCwrgsXVSwOGNe');
    console.log('Match admin123:', match);
})();
