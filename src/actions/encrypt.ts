import "server-only";
import crypto from "crypto";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const keyB64 = process.env.OAUTH_TOKEN_ENC_KEY;
  if (!keyB64) {
    throw new Error("Missing OAUTH_TOKEN_ENC_KEY");
  }

  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error("OAUTH_TOKEN_ENC_KEY must be 32 bytes (base64-encoded)");
  }

  cachedKey = key;
  return key;
}

export function encryptString(plain: string): string {
  const KEY = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}
export function decryptString(enc: string): string {
  const KEY = getKey();
  const [ivB64, tagB64, dataB64] = enc.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted payload");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}