import { startHosted } from "./hosted";
startHosted("staging").catch(() => {
  console.error(
    "Staging startup failed. Check configuration, database permissions and applied migrations.",
  );
  process.exitCode = 1;
});
