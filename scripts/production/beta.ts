import { startHosted } from "./hosted";
import { validateFreeBeta } from "../../src/server/free-beta";
startHosted("production", validateFreeBeta).catch(() => {
  console.error(
    "Beta startup failed. Check launch approvals, capacity limits, sender, runtime database permissions and migrations.",
  );
  process.exitCode = 1;
});
