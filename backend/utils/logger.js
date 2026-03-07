const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const getTimestamp = () => new Date().toISOString();

const formatLog = (level, message, meta = {}) => {
    const entry = {
        timestamp: getTimestamp(),
        level,
        message,
        ...meta
    };
    return JSON.stringify(entry);
};

const writeToFile = (filename, content) => {
    const filePath = path.join(LOG_DIR, filename);
    fs.appendFileSync(filePath, content + '\n');
};

const logger = {
    info: (message, meta = {}) => {
        const log = formatLog('INFO', message, meta);
        console.log(`ℹ️  ${message}`);
        writeToFile('app.log', log);
    },

    warn: (message, meta = {}) => {
        const log = formatLog('WARN', message, meta);
        console.warn(`⚠️  ${message}`);
        writeToFile('app.log', log);
    },

    error: (message, meta = {}) => {
        const log = formatLog('ERROR', message, meta);
        console.error(`❌ ${message}`);
        writeToFile('error.log', log);
        writeToFile('app.log', log);
    },

    debug: (message, meta = {}) => {
        if (process.env.NODE_ENV === 'development') {
            const log = formatLog('DEBUG', message, meta);
            console.log(`🔍 ${message}`);
            writeToFile('debug.log', log);
        }
    },

    request: (req, meta = {}) => {
        const log = formatLog('REQUEST', `${req.method} ${req.originalUrl}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id,
            ...meta
        });
        writeToFile('access.log', log);
    }
};

module.exports = logger;
