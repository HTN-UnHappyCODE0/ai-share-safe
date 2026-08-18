import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function proxyRequest(req: NextRequest, pathParts: string[]) {
  // Determine backend URL at runtime (Docker container name 'backend' or localhost fallback)
  const backendBase =
    process.env.INTERNAL_BACKEND_URL ||
    (process.env.NODE_ENV === "production" ? "http://backend:8080" : "http://127.0.0.1:8080");

  const path = pathParts ? pathParts.join("/") : "";
  const query = req.nextUrl.search || "";
  const targetUrl = `${backendBase}/api/${path}${query}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Exclude host header to let fetch set correct host for backend
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  try {
    let body: BodyInit | undefined = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        body = await req.text();
      } else {
        body = req.body as any;
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      // @ts-ignore
      duplex: "half",
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err: any) {
    console.error(`[API Proxy Error] Failed to proxy to ${targetUrl}:`, err);
    return NextResponse.json(
      {
        error: `Không thể kết nối đến Backend (${targetUrl}): ${err.message}`,
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}
