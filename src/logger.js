import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.logFile = options.logFile || './output/log.txt';
    this.logBuffer = [];
    this.startTime = Date.now();
  }

  /**
   * Initialize logger - ensure log file directory exists
   */
  async init() {
    try {
      await fs.ensureDir(path.dirname(this.logFile));
      await fs.writeFile(this.logFile, '');
      this.info('Logger initialized');
    } catch (error) {
      console.error('Failed to initialize logger:', error.message);
    }
  }

  /**
   * Format timestamp
   */
  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Write log to file
   */
  async writeToFile(level, message) {
    const timestamp = this.getTimestamp();
    const logLine = `[${timestamp}] ${level}: ${message}\n`;
    this.logBuffer.push(logLine);

    try {
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * INFO level log
   */
  info(message) {
    const formatted = chalk.blue('[INFO]') + ' ' + message;
    console.log(formatted);
    this.writeToFile('INFO', message);
  }

  /**
   * SUCCESS level log
   */
  success(message) {
    const formatted = chalk.green('[SUCCESS]') + ' ' + message;
    console.log(formatted);
    this.writeToFile('SUCCESS', message);
  }

  /**
   * WARNING level log
   */
  warn(message) {
    const formatted = chalk.yellow('[WARN]') + ' ' + message;
    console.warn(formatted);
    this.writeToFile('WARN', message);
  }

  /**
   * ERROR level log
   */
  error(message, error = null) {
    const formatted = chalk.red('[ERROR]') + ' ' + message;
    console.error(formatted);

    let fullMessage = message;
    if (error) {
      console.error(chalk.red(error.stack || error.message || error));
      fullMessage += '\n' + (error.stack || error.message || error);
    }

    this.writeToFile('ERROR', fullMessage);
  }

  /**
   * DEBUG level log (only if verbose mode)
   */
  debug(message) {
    if (this.verbose) {
      const formatted = chalk.gray('[DEBUG]') + ' ' + message;
      console.log(formatted);
      this.writeToFile('DEBUG', message);
    }
  }

  /**
   * Get elapsed time since logger start
   */
  getElapsedTime() {
    const elapsed = Date.now() - this.startTime;
    return (elapsed / 1000).toFixed(1);
  }

  /**
   * Log completion with elapsed time
   */
  complete(message) {
    const elapsed = this.getElapsedTime();
    const fullMessage = `${message} (Elapsed: ${elapsed}s)`;
    this.success(fullMessage);
  }

  /**
   * Get all logs as string
   */
  getLogs() {
    return this.logBuffer.join('');
  }
}

export default Logger;
