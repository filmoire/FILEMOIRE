import { NextRequest, NextResponse } from "next/server";
import { isStaging, stagingAccessAllowed } from "@/lib/deployment";

// Public illustrations and sample audio also serve the marketing/sample-book pages.
// Keep this exact: demo application routes must remain unavailable in live mode.
const publicSampleAssets = new Set([
  "/demo/atelier.svg",
  "/demo/boulangerie.svg",
  "/demo/classe.svg",
  "/demo/cuisine.svg",
  "/demo/jardin.svg",
  "/demo/mariage.svg",
  "/demo/plage.svg",
  "/demo/exemple-enregistrement.wav",
]);

export async function middleware(request: NextRequest) {
  const respond = (response: NextResponse) => {
    if (isStaging()) {
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      response.headers.append("Vary", "Authorization");
    }
    return response;
  };
  if (isStaging()) {
    // Health returns only a status, never application or account data.
    const health =
      request.nextUrl.pathname === "/api/v1/health" && request.method === "GET";
    if (
      !health &&
      !(await stagingAccessAllowed(request.headers.get("authorization")))
    )
      return new NextResponse("Private staging / Préproduction privée", {
        status: 401,
        headers: {
          "WWW-Authenticate":
            'Basic realm="Filemoire staging", charset="UTF-8"',
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      });
  }
  if (process.env.APP_MODE !== "live") return respond(NextResponse.next());
  const pathname = request.nextUrl.pathname;
  if (publicSampleAssets.has(pathname)) return respond(NextResponse.next());
  if (/^\/(acheteur|narrateur|editeur|admin)(\/|$)/.test(pathname))
    return respond(
      NextResponse.redirect(
        new URL(
          pathname === "/acheteur/offrir" ? "/offrir" : "/espace",
          request.url,
        ),
      ),
    );
  if (pathname === "/connexion")
    return respond(NextResponse.redirect(new URL("/acces", request.url)));
  if (/^\/(demo|invitation|ecouter)(\/|$)/.test(pathname))
    return respond(new NextResponse("Page indisponible.", { status: 404 }));
  return respond(NextResponse.next());
}
export const config = {
  matcher: ["/:path*"],
};
