import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('169.254.')) return true;

  const m172 = /^172\.(\d{1,2})\./.exec(host);
  if (m172) {
    const second = Number(m172[1]);
    if (second >= 16 && second <= 31) return true;
  }

  return false;
}

function parseAllowedHosts() {
  const raw = process.env.CASTKIT_RPC_PROXY_ALLOWLIST || '';
  const hosts = raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  return hosts;
}

function isAllowedHost(hostname: string) {
  const allowed = parseAllowedHosts();
  if (allowed.length === 0) return true;

  const host = hostname.toLowerCase();
  return allowed.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
}

export async function POST(request: NextRequest) {
  const target = request.headers.get('x-castkit-rpc-url');

  if (!target) {
    return NextResponse.json({ error: 'Missing x-castkit-rpc-url header' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'Invalid RPC URL' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only https RPC endpoints are allowed' }, { status: 400 });
  }

  if (isPrivateHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Private network RPC endpoints are blocked' }, { status: 403 });
  }

  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'RPC host is not allowlisted' }, { status: 403 });
  }

  const rawBody = await request.text();

  const upstream = await fetch(parsed.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: rawBody,
    cache: 'no-store'
  });

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
