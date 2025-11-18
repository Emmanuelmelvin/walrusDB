/** Represents a secret key structure */
export interface Key {
  secret: string;
}

/**
 * KeyPair class to manage a single secret key
 */
export class KeyPair {
  private secret: Key;

  /**
   * Create a KeyPair instance
   * @param secret - Initial secret key
   */
  constructor(secret: Key) {
    this.secret = secret;
  }

  /**
   * Get the current secret key
   * @returns {Key} The secret key
   */
  getKey(): Key {
    return this.secret;
  }

  /**
   * Update the secret key
   * @param {Key} secret - New secret key
   */
  setKey(secret: Key): void {
    this.secret = secret;
  }
}
