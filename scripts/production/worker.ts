import { processOne, scheduleDue } from "../../src/server/worker";
import { pool } from "../../src/server/db";
async function main() {
  let stopping = false;
  process.on("SIGTERM", () => {
    stopping = true;
  });
  process.on("SIGINT", () => {
    stopping = true;
  });
  let nextSweep = 0;
  while (!stopping) {
    try {
      if (Date.now() > nextSweep) {
        await scheduleDue();
        nextSweep = Date.now() + 60000;
      }
      if (!(await processOne())) await new Promise((r) => setTimeout(r, 1000));
    } catch {
      console.error(JSON.stringify({ event: "worker_cycle_failed" }));
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  await pool().end();
}
main().catch(() => {
  console.error("worker failed. Check configuration and service logs.");
  process.exitCode = 1;
});
