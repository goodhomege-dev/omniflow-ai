import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '../config/env';

const COOKIE_NAME = 'omniflow_admin_session';

async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  }
  return btoa(str);
}

function fromBase64(b64: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf8');
  }
  return atob(b64);
}

export async function createSessionToken(password: string): Promise<string> {
  const env = getEnv();
  const timestamp = Date.now().toString();
  const data = `${password}:${timestamp}`;
  const signature = await hmacSha256Hex(data, env.SESSION_SECRET);
  return toBase64(`${data}:${signature}`);
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const env = getEnv();
    const decoded = fromBase64(token);
    const [password, timestamp, signature] = decoded.split(':');

    if (!password || !timestamp || !signature) return false;
    if (password !== env.ADMIN_PASSWORD) return false;

    // Check expiry (7 days)
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || Date.now() - tokenTime > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }

    const expected = await hmacSha256Hex(`${password}:${timestamp}`, env.SESSION_SECRET);
    return signature === expected;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}

export async function checkAdminApiAuth(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}
