import { startHosted } from "./hosted";
import { validateFreeBeta } from "../../src/server/free-beta";
import { startupFailureReason } from "../../src/server/startup-error";
startHosted("production", validateFreeBeta).catch((error: unknown) => {
  console.error(`Beta startup failed: ${startupFailureReason(error)}`);
  process.exitCode = 1;
});
