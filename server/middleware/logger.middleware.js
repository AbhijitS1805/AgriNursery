const winston = require('winston');
const morgan = require('morgan');
const path = require('path');

/**
 * Logging Middleware Configuration
 * Structured logging with Winston and HTTP request logging with Morgan
 */

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console output
  new winston.transports.Console(),
  
  // Error logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.uncolorize(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format: winston.format.combine(
      winston.format.uncolorize(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/exceptions.log') 
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/rejections.log') 
    })
  ]
});

// Morgan HTTP request logger
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';

const morganMiddleware = morgan(
  morganFormat,
  {
    stream: {
      write: (message) => {
        const msg = message.trim();
        
        // Parse the message to determine log level
        if (msg.includes('500') || msg.includes('400')) {
          logger.error(msg);
        } else if (msg.includes('404')) {
          logger.warn(msg);
        } else {
          logger.http(msg);
        }
      },
    },
  }
);

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  });
  next(err);
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip} - User: ${req.user?.username || 'anonymous'}`);
  next();
};

module.exports = {
  logger,
  morganMiddleware,
  errorLogger,
  requestLogger
};
