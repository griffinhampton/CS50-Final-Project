"server-only";
import crypto from "crypto";

const KEY_B64 = process.env.OAUTH_TOKEN_ENC_KEY;
if (!KEY_B64) throw new Error("Missing OAUTH");

const KEY = Buffer.from(KEY_B64, "base64");
if (KEY.length !== 32) throw new Error("OAUTH_TOKEN_ENC_KEY must be 32 bytes (base64-encoded)");

export function encryptString(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}
export function decryptString(enc: string): string {
  const [ivB64, tagB64, dataB64] = enc.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted payload");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}