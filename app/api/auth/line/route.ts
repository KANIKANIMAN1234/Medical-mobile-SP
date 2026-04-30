import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.NEXT_PUBLIC_LINE_LOGIN_REDIRECT_URI!,
      client_id: process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID!,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    });

    const res = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error_description || 'token error' }, { status: 400 });

    return NextResponse.json({ id_token: data.id_token });
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
