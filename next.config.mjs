const service = process.env.FILEMOIRE_SERVICE || "full";
if (!["full", "frontend", "backend"].includes(service))
  throw new Error("FILEMOIRE_SERVICE must be full, frontend or backend");
let backendOrigin;
if (service === "frontend") {
  try {
    const url = new URL(process.env.BACKEND_ORIGIN);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)
        ))
    )
      throw new Error();
    backendOrigin = url.origin;
  } catch {
    throw new Error(
      "Frontend builds require BACKEND_ORIGIN: an HTTPS origin (or local HTTP for testing)",
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  // Bake the role into the artifact; a frontend must never run the database API.
  env: { FILEMOIRE_SERVICE: service },
  async rewrites() {
    return {
      // Run before filesystem/API routes, preserving cookies, Origin, binary bodies
      // and Set-Cookie without a second Vercel Function buffering media responses.
      beforeFiles: backendOrigin
        ? [
            {
              source: "/api/v1/:path*",
              destination: `${backendOrigin}/api/v1/:path*`,
            },
          ]
        : [],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'" +
              (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};
export default nextConfig;
