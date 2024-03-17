import winston from 'winston';
import { createLogger, format, transports, addColors } from 'winston';
import { fileURLToPath } from 'url';
import stripAnsi from 'strip-ansi';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGGER_MSG_ICONS = {
  error: "📕",
  warn: "📙",
  info: "📘",
  success: "📗",
  unknown: "🔘",
};

const logFilePath = path.join(__dirname, '..', '..', 'result', 'error.log');

const LOGGER_MSG_COLORS = {
  error: "bold red",
  warn: "bold yellow",
  info: "bold white",
  success: "bold green",
};

const consoleFormat = format.combine(
  winston.format.colorize({ all: true }),
  winston.format.label({ label: ' [LOGGER]' }),
  winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss'}),
  winston.format.printf((info) => {
    const cleanLevel = info.level.replace(/\u001b\[.*?m/g, '');
    const pre = LOGGER_MSG_ICONS[cleanLevel.toLowerCase()] || '';

    let prefixLength = 4;

    switch (cleanLevel) {
      case 'success':
        prefixLength -= 3
        break;
      case 'error':
        prefixLength -= 1
        break;
      default:
        break;
    }

    const padding = ' '.repeat(prefixLength);

    return `${pre}${info.label} ${info.timestamp} ${info.level}:${padding} ${info.message}`;
  })
);

const fileFormat = format.combine(
  winston.format.label({ label: ' [LOGGER]' }),
  winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss'}),
  winston.format.printf((info) => {
    const cleanLevel = info.level.replace(/\u001b\[.*?m/g, '');
    const pre = LOGGER_MSG_ICONS[cleanLevel.toLowerCase()] || '';

    let prefixLength = 4;

    switch (cleanLevel) {
      case 'success':
        prefixLength -= 3
        break;
      case 'error':
        prefixLength -= 1
        break;
      default:
        break;
    }

    const padding = ' '.repeat(prefixLength);

    return `${pre}${info.label} ${info.timestamp} ${info.level}:${padding} ${stripAnsi(info.message)}`;
  })
);

export const logger = createLogger({
  levels: {
    error: 0,
    warn: 1,
    info: 1,
    success: 1,
    unknown: 1,
  },
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.File({ filename: logFilePath, level: 'error', format: fileFormat }),
  ],
});

addColors(LOGGER_MSG_COLORS);