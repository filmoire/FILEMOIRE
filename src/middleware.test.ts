import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

beforeEach(() => {
  vi.stubEnv("APP_MODE", "live");
  vi.stubEnv("DEPLOYMENT_STAGE", "staging");
  vi.stubEnv("STAGING_ACCESS_USER", "filemoire");
  vi.stubEnv("STAGING_ACCESS_PASSWORD", "a".repeat(43));
});
afterEach(() => vi.unstubAllEnvs());
const request = (path: string, authorization?: string, method = "GET") =>
  new NextRequest(`https://staging.example.test${path}`, {
    method,
    headers: authorization ? { authorization } : {},
  });
const credentials = () => `Basic ${btoa(`filemoire:${"a".repeat(43)}`)}`;
it.each([
  "/",
  "/espace",
  "/api/v1/me",
  "/api/v1/auth/request",
  "/demo/jardin.svg",
  "/_next/static/fixture.js",
  "/api/v1/health/other",
])("protects staging route %s before app routing", async (path) => {
  const response = await middleware(request(path));
  expect(response.status).toBe(401);
  expect(response.headers.get("www-authenticate")).toContain("Basic");
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("exposes only the GET health route for hosting probes", async () => {
  expect((await middleware(request("/api/v1/health"))).status).toBe(200);
  expect(
    (await middleware(request("/api/v1/health", undefined, "POST"))).status,
  ).toBe(401);
});
it.each([
  "Bearer token",
  "Basic !!!",
  `Basic ${btoa("wrong:credentials")}`,
  "Basic " + "a".repeat(2048),
])("rejects malformed or incorrect staging credentials", async (value) => {
  expect((await middleware(request("/", value))).status).toBe(401);
});
it("allows the correct credentials and retains live demo restrictions", async () => {
  const response = await middleware(request("/", credentials()));
  expect(response.headers.get("cache-control")).toContain("private, no-store");
  expect(response.headers.get("vary")).toContain("Authorization");
  expect((await middleware(request("/espace", credentials()))).status).toBe(
    200,
  );
  expect(
    (await middleware(request("/demo/jardin.svg", credentials()))).status,
  ).toBe(200);
  expect(
    (await middleware(request("/demo/private", credentials()))).status,
  ).toBe(404);
  expect(
    (await middleware(request("/acheteur", credentials()))).headers.get(
      "location",
    ),
  ).toBe("https://staging.example.test/espace");
});
it("fails closed if the staging password is missing", async () => {
  vi.stubEnv("STAGING_ACCESS_PASSWORD", "");
  expect((await middleware(request("/", credentials()))).status).toBe(401);
});
it("does not add the staging password gate to normal deployments", async () => {
  vi.stubEnv("DEPLOYMENT_STAGE", "production");
  expect((await middleware(request("/espace"))).status).toBe(200);
  expect((await middleware(request("/demo/private"))).status).toBe(404);
});
it("serves only API routes on the Render backend", async () => {
  vi.stubEnv("FILEMOIRE_SERVICE", "backend");
  for (const path of [
    "/",
    "/acces",
    "/espace",
    "/demo/jardin.svg",
    "/api/v10/me",
  ])
    expect((await middleware(request(path, credentials()))).status).toBe(404);
  expect((await middleware(request("/api/v1/me", credentials()))).status).toBe(
    200,
  );
  expect((await middleware(request("/api/v1/me"))).status).toBe(401);
  expect((await middleware(request("/api/v1/health"))).status).toBe(200);
});
