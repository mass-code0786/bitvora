import "server-only";
import argon2 from "argon2";

export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string) {
  return password.trim().length >= PASSWORD_MIN_LENGTH;
}

export function hashPassword(password: string) {
  if (!validatePassword(password)) throw new Error("Password must be at least 8 characters.");
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string) {
  if (!password || !hash) return false;
  try { return await argon2.verify(hash, password); }
  catch { return false; }
}
