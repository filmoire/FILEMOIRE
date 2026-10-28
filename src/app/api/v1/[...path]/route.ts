export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function route(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  // The build-time role removes the backend import from the Vercel artifact.
  // A failed external rewrite must never fall back to a local database handler.
  if (process.env.FILEMOIRE_SERVICE !== "frontend") {
    const { handleApi } = await import("@/server/api");
    return handleApi(request, (await context.params).path);
  }
  return Response.json(
    { error: "Service temporairement indisponible." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
export {
  route as GET,
  route as POST,
  route as PUT,
  route as PATCH,
  route as DELETE,
};
