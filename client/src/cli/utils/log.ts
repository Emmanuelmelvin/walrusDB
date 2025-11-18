/**
 * Simple logging utility for WalrusDB CLI/SDK
 * Provides info, warn, error, and success logging with colors.
 */

type LogMessage = string | Error;

export function info(msg: LogMessage) {
  const message = typeof msg === "string" ? msg : msg.message;
  console.log(`\x1b[32minfo\x1b[0m: ${message}`);
}

export function warn(msg: LogMessage) {
  const message = typeof msg === "string" ? msg : msg.message;
  console.warn(`\x1b[33mwarn\x1b[0m: ${message}`);
}

export function error(msg: LogMessage) {
  const message = typeof msg === "string" ? msg : msg.message;
  console.error(`\x1b[31merror\x1b[0m: ${message}`);
}

export function success(msg: LogMessage) {
  const message = typeof msg === "string" ? msg : msg.message;
  console.log(`\x1b[32msuccess\x1b[0m: ${message}`);
}
