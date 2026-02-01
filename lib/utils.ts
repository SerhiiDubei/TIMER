import { customAlphabet } from 'nanoid';
import bcrypt from 'bcryptjs';

// Generate short room codes (6 uppercase alphanumeric)
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

export function generateRoomCode(): string {
  return nanoid();
}

// Generate admin key (longer, more secure)
const adminKeyGenerator = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  32
);

export function generateAdminKey(): string {
  return adminKeyGenerator();
}

// Generate game codes (8 characters with dash)
const codeGenerator = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 3);

export function generateGameCode(): string {
  return `${codeGenerator()}-${codeGenerator()}`;
}

// Hash codes for storage
export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

// Verify code against hash
export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

// Calculate remaining time (client-side approximation)
export function calculateRemainingTime(
  baseSeconds: number,
  startedAt: string | null,
  adjustments: number
): number {
  if (!startedAt) return baseSeconds;
  
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  return Math.max(0, baseSeconds - elapsed + adjustments);
}

// Format time for display
export function formatTime(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
