/**
 * Registration Token Utilities
 * Functions for generating and validating registration tokens
 */

/**
 * Generate a secure random token for registration
 * @param length - Length of the token (default: 32)
 * @returns A random token string
 */
export function generateRegistrationToken(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

/**
 * Validate token format (basic validation)
 * @param token - Token to validate
 * @returns true if token format is valid
 */
export function isValidTokenFormat(token: string): boolean {
  // Token should be alphanumeric and between 16-64 characters
  return /^[A-Za-z0-9]{16,64}$/.test(token);
}

/**
 * Generate a user-friendly token (shorter, easier to share)
 * Format: XXXX-XXXX-XXXX-XXXX
 */
export function generateUserFriendlyToken(): string {
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const part = generateRegistrationToken(4);
    parts.push(part);
  }
  return parts.join("-");
}

