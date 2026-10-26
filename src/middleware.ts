import { NextRequest, NextResponse } from "next/server";

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

export function middleware(request: NextRequest) {
  if (process.env.APP_MODE !== "live") return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (publicSampleAssets.has(pathname)) return NextResponse.next();
  if (/^\/(acheteur|narrateur|editeur|admin)(\/|$)/.test(pathname))
    return NextResponse.redirect(
      new URL(
        pathname === "/acheteur/offrir" ? "/offrir" : "/espace",
        request.url,
      ),
    );
  if (pathname === "/connexion")
    return NextResponse.redirect(new URL("/acces", request.url));
  if (/^\/(demo|invitation|ecouter)(\/|$)/.test(pathname))
    return new NextResponse("Page indisponible.", { status: 404 });
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/acheteur/:path*",
    "/narrateur/:path*",
    "/editeur/:path*",
    "/admin/:path*",
    "/connexion",
    "/demo/:path*",
    "/invitation/:path*",
    "/ecouter/:path*",
  ],
};
