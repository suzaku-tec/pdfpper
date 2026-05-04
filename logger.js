const winston = require("winston");
const path = require("path");

/**
 * ロガー初期化
 * コンソール出力とログファイル出力を設定します
 * @param {string} logLevel - ログレベル（error, warn, info, debug）デフォルト: info
 * @returns {winston.Logger} ロガーインスタンス
 */
function createLogger(logLevel = "info") {
  const logsDir = path.join(__dirname, "logs");

  // ログディレクトリが存在しなければ作成
  const fs = require("fs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      if (stack) {
        return `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`;
      }
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    }),
  );

  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports: [
      // コンソール出力
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.printf(({ timestamp, level, message, stack }) => {
            if (stack) {
              return `${timestamp} [${level}] ${message}\n${stack}`;
            }
            return `${timestamp} [${level}] ${message}`;
          }),
        ),
      }),
      // 全ログをファイルに出力
      new winston.transports.File({
        filename: path.join(logsDir, "combined.log"),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // エラーログのみをファイルに出力
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });

  return logger;
}

module.exports = createLogger;
