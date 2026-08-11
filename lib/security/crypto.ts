import crypto from "node:crypto";
import { env } from "@/lib/env";

// AES-256-GCM encryption for Meta access/refresh tokens at rest.
// Server-only module — never import this from a Client Component.

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = env.tokenEncryptionKey;
  if (!raw || raw.length < 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is missing or too short. Set a 32+ byte secret in .env before storing tokens."
    );
  }
  // Accept either a hex-encoded 32-byte key or any long passphrase (hashed down to 32 bytes).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  return crypto.createHash("sha256").update(raw).digest();
}

/** Encrypts a plaintext secret (e.g. a Meta access token) into a storable string. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/** Decrypts a string produced by encryptSecret. Returns null if malformed/undecryptable. */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    const [ivHex, tagHex, dataHex] = stored.split(":");
    if (!ivHex || !tagHex || !dataHex) return null;
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
