// modules/logger.js
const colors = require('colors');
const fs = require('fs');
const path = require('path');
const CONFIG = require('./arcadiusConfig');

// S'assurer que le répertoire de logs existe
const ensureLogsDirectory = () => {
    if (!fs.existsSync(CONFIG.LOGS_DIR)) {
        fs.mkdirSync(CONFIG.LOGS_DIR, { recursive: true });
    }
};

ensureLogsDirectory();

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
        this.emojis = {
            debug: '🔍',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌'
        };
    }

    formatMessage(level, message) {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
        const emoji = this.emojis[level];
        return `[${timestamp}] ${emoji} [${level.toUpperCase()}] ${message}`;
    }

    formatConsoleMessage(level, formattedMessage) {
        switch (level) {
            case 'debug':
                return colors.gray(formattedMessage);
            case 'info':
                return colors.cyan.bold(formattedMessage);
            case 'warn':
                return colors.yellow.bold(formattedMessage);
            case 'error':
                return colors.red.bold.underline(formattedMessage);
            default:
                return formattedMessage;
        }
    }

    writeToFile(formattedMessage) {
        try {
            const logFile = path.join(CONFIG.LOGS_DIR, `arcadius-${new Date().toISOString().split('T')[0]}.log`);
            fs.appendFileSync(logFile, formattedMessage + '\n', 'utf-8');
        } catch (err) {
            console.error(`Erreur d'écriture dans le fichier log: ${err.message}`);
        }
    }

    log(level, message) {
        if (this.levels[level] < this.levels[this.logLevel]) return;

        const formattedMessage = this.formatMessage(level, message);
        this.writeToFile(formattedMessage);

        const coloredMessage = this.formatConsoleMessage(level, formattedMessage);
        console.log(coloredMessage);
    }

    debug(message) {
        this.log('debug', message);
    }

    info(message) {
        this.log('info', message);
    }

    warn(message) {
        this.log('warn', message);
    }

    error(message) {
        this.log('error', message);
    }
}

module.exports = new Logger();
