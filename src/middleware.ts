import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  if (process.env.APP_MODE !== "live") return NextResponse.next();
  const pathname = request.nextUrl.pathname;
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
