import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url param', { status: 400 });

  try {
    const target = new URL(url);
    const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');
    const allowedHosts = new Set([apiUrl.hostname]);

    if (target.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && target.protocol === 'http:')) {
      return new NextResponse('Unsupported image URL protocol', { status: 400 });
    }
    if (!allowedHosts.has(target.hostname) || target.username || target.password) {
      return new NextResponse('Image host is not allowed', { status: 403 });
    }

    const upstream = await fetch(target, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) {
      return new NextResponse(`Upstream ${upstream.status}`, { status: upstream.status });
    }
    const contentType = upstream.headers.get('content-type') || '';
    const allowedContentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowedContentTypes.has(contentType.split(';')[0].trim().toLowerCase())) {
      return new NextResponse('Upstream did not return a supported image', { status: 415 });
    }
    const declaredSize = Number(upstream.headers.get('content-length') || 0);
    if (declaredSize > 10 * 1024 * 1024) {
      return new NextResponse('Image is too large', { status: 413 });
    }
    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return new NextResponse('Image is too large', { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Proxy error', { status: 502 });
  }
}
