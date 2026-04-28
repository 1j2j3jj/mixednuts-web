/**
 * PBKDF2-SHA256 password hashing using Web Crypto SubtleCrypto.
 *
 * Edge + Node compatible (Web Crypto is available in both runtimes since
 * Node 16+ and all Edge runtimes).
 *
 * Used by client_credentials Basic Auth (DB-backed). Plaintext is never
 * persisted; only (salt, hash, iterations) tuples.
 *
 * @see RFC 2898, NIST SP 800-132
 */

const DEFAULT_ITERATIONS = 100000;
const HASH_LENGTH_BYTES = 32; // 256 bits

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBuffer(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  password: string,
  saltBytes: Uint8Array,
  iterations: number
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new Uint8Array(saltBytes),
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    HASH_LENGTH_BYTES * 8
  );
}

export interface HashedPassword {
  hash: string; // base64
  salt: string; // base64
  iterations: number;
}

/** Hash a plaintext password with a random salt. */
export async function hashPassword(plaintext: string): Promise<HashedPassword> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const derived = await deriveKey(plaintext, saltBytes, DEFAULT_ITERATIONS);
  return {
    hash: bufferToBase64(derived),
    salt: bufferToBase64(saltBytes),
    iterations: DEFAULT_ITERATIONS,
  };
}

/** Verify a plaintext password against stored (hash, salt, iterations). */
export async function verifyPassword(
  plaintext: string,
  stored: { hash: string; salt: string; iterations: number }
): Promise<boolean> {
  try {
    const saltBytes = base64ToBuffer(stored.salt);
    const derived = await deriveKey(plaintext, saltBytes, stored.iterations);
    const computed = bufferToBase64(derived);
    // Constant-time comparison.
    if (computed.length !== stored.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ stored.hash.charCodeAt(i);
    }
    return diff === 0;
  } catch (err) {
    console.error("[password-hash] verify failed:", err);
    return false;
  }
}
