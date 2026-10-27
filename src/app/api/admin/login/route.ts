import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/config/env';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const env = getEnv();

    if (!password || password !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: 'პაროლი არასწორია' }, { status: 401 });
    }

    const token = await createSessionToken(password);
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, token);
    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
