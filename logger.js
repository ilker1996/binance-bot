const winston = require('winston');

const { combine, timestamp, errors, splat, json, prettyPrint, simple, label, printf, colorize} = winston.format;

const custom_log_format = printf(({label, timestamp, level, message}) => {
    return `[${timestamp}] - [${label}] - [${level.toUpperCase()}] : ${message}`;
});

const test_log_format = printf(({label, message}) => {
    return `[${label}] : ${message}`;
});

const test_logger = (category, log_directory="logs/test")  => winston.createLogger({
    format: combine(
        label({ label: "TEST - " + category }),
        splat(),
        prettyPrint(),
        test_log_format
    ),
    transports: [
        new winston.transports.File({ dirname: log_directory, filename: category + ".log" }) 
    ],
    exceptionHandlers : [
        new winston.transports.Console(),
    ],
    exitOnError : false
});

const add_logger = (category, log_directory="logs") => {
    return winston.loggers.add(category, {
        format: combine(
            timestamp( {format: "MM-DD HH:mm:ss"}),
            label({ label: category }),
            errors({ stack: true }),
            splat(),
            json(),
            prettyPrint(),
            custom_log_format
        ),
        transports: [
            new winston.transports.File({ dirname: log_directory, filename: category + ".log" }) 
        ],
        exceptionHandlers : [
            new winston.transports.Console(),
        ],
        exitOnError : false
    });
}

exports.test_logger = test_logger;
exports.add_logger = add_logger;
