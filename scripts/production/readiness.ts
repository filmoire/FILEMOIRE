import { readFile } from "node:fs/promises";
import { config } from "../../src/server/config";
import { pool } from "../../src/server/db";
async function main() {
  const path = process.argv[2];
  if (!path)
    throw new Error(
      "Pass a completed launch-evidence.json file. See deployment/launch-evidence.example.json.",
    );
  const e = JSON.parse(await readFile(path, "utf8"));
  const checks: Record<string, boolean> = {
    "scope approved": e.scopeApproved === true,
    "legal review and processor contracts":
      !!e.legalReviewUrl && e.processorContractsApproved === true,
    "staging HTTPS":
      typeof e.stagingUrl === "string" && e.stagingUrl.startsWith("https://"),
    "restore and rollback drills":
      !!e.restoreDrillDate && !!e.rollbackDrillDate,
    "payment sandbox": !!e.paymentSandboxEvidence,
    "email delivery": !!e.emailDeliveryEvidence,
    "voice quality": !!e.transcriptionQualityEvidence,
    "supplier PDF acceptance": !!e.supplierPdfAcceptance,
    "five physical books": e.physicalBooksAccepted >= 5,
    "30 real pilot families": e.realPilotFamilies >= 30,
    "device and accessibility testing": !!e.deviceAccessibilityEvidence,
    "support and security review": !!e.supportOwner && !!e.securityReview,
    "owner go-live decision": e.goLiveApproved === true,
  };
  try {
    config();
    checks["server configuration"] = true;
    const db = pool();
    await db.query("SELECT 1");
    checks["database"] = true;
    const h = (
      await db.query(
        "SELECT seen_at>now()-interval '3 minutes' AS fresh FROM service_heartbeats WHERE name='worker'",
      )
    ).rows[0];
    checks["worker heartbeat"] = !!h?.fresh;
    const failed = await db.query(
      "SELECT count(*) FROM jobs WHERE state='failed'",
    );
    checks["no failed jobs"] = Number(failed.rows[0].count) === 0;
    await db.end();
  } catch {
    checks["server configuration and services"] = false;
  }
  for (const [name, pass] of Object.entries(checks))
    console.log(`${pass ? "PASS" : "BLOCKED"} ${name}`);
  console.log(
    "Evidence entries require human verification; this command does not certify compliance or supplier quality.",
  );
  if (Object.values(checks).some((v) => !v)) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
