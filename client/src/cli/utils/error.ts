/**
 * Base custom error class for WalrusDB-related errors.
 */
export class WalrusDBError extends Error {
  metadata?: Record<string, any>;

  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = "WalrusDBError";

    if (cause) {
      (this as any).cause = cause;
    }

    if (metadata) {
      this.metadata = metadata;
    }
  }
}

/**
 * ----- Specific WalrusDB Error Variants -----
 * All extend WalrusDBError and include optional cause + metadata.
 */

export class WalrusDBClientError extends WalrusDBError {
  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message, cause, metadata);
    this.name = "WalrusDBClientError";
  }
}

export class WalrusDBSealError extends WalrusDBError {
  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message, cause, metadata);
    this.name = "WalrusDBSealError";
  }
}

export class WalrusDBValidationError extends WalrusDBError {
  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message, cause, metadata);
    this.name = "WalrusDBValidationError";
  }
}

export class WalrusDBNotFoundError extends WalrusDBError {
  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message, cause, metadata);
    this.name = "WalrusDBNotFoundError";
  }
}

export class WalrusDBNoAccessError extends WalrusDBError {
  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message, cause, metadata);
    this.name = "WalrusDBNoAccessError";
  }
}

export class WalrusDBRetryableError extends WalrusDBError {
  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message, cause, metadata);
    this.name = "WalrusDBRetryableError";
  }
}

export class WalrusDBTransactionError extends WalrusDBError {
  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message, cause, metadata);
    this.name = "WalrusDBTransactionError";
  }
}

export class WalrusDBConfigError extends WalrusDBError {
  constructor(message: string, cause?: Error, metadata?: Record<string, any>) {
    super(message, cause, metadata);
    this.name = "WalrusDBConfigError";
  }
}
