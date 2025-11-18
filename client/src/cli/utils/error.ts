/**
 * Custom error class for WalrusDB-related errors.
 */
export class WalrusError extends Error {
  /**
   * Creates a new WalrusError.
   *
   * @param message - The error message.
   * @param cause - Optional underlying error cause.
   */
  constructor(message: string, cause?: Error) {
    super(message);

    // Set the prototype explicitly (needed for TS + ES5 targets)
    Object.setPrototypeOf(this, WalrusError.prototype);

    this.name = "WalrusError";

    // Optional: store the original cause
    if (cause) {
      (this as any).cause = cause;
    }
  }
}
