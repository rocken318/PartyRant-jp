import { NextResponse } from 'next/server';
import { networkInterfaces } from 'os';

// Returns the server's local network URL so QR codes work on mobile during dev
export function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const port = reqUrl.port || '3000';
  const proto = reqUrl.protocol; // http: or https:

  // Find the first non-internal IPv4 address
  const nets = networkInterfaces();
  let localIp: string | null = null;
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
    if (localIp) break;
  }

  const networkUrl = localIp
    ? `${proto}//${localIp}:${port}`
    : null;

  return NextResponse.json({ networkUrl });
}
