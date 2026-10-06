interface Env { ASSETS: { fetch(req: Request): Promise<Response> } }

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/api/health") {
      return Response.json(
        { ok: true, product: "Ops Reliability Desk (independent concept, not affiliated with Clipboard)", storage: "none: state is browser-only", data: "synthetic", connectors: "simulated in browser" },
        { headers: { ...SECURITY_HEADERS, "Cache-Control": "no-store" } },
      );
    }
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "not_found" }, { status: 404, headers: SECURITY_HEADERS });
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { ...SECURITY_HEADERS, Allow: "GET, HEAD" } });
    }
    const res = await env.ASSETS.fetch(req);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
    return out;
  },
};
