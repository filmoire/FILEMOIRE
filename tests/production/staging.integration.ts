import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import {
  configureTests,
  resetTests,
  closeTestDatabase,
  newestEmailToken,
} from "./helpers";
import {
  consumeLogin,
  currentAccount,
  requestLogin,
} from "../../src/server/auth";
import { pool } from "../../src/server/db";
import { hash } from "../../src/server/security";

beforeAll(configureTests);
beforeEach(resetTests);
afterEach(() => vi.unstubAllEnvs());
afterAll(closeTestDatabase);
function privateStaging() {
  for (const [name, value] of Object.entries({
    DEPLOYMENT_STAGE: "staging",
    NEXT_PUBLIC_DEPLOYMENT_STAGE: "staging",
    STAGING_ACCESS_USER: "filemoire",
    STAGING_ACCESS_PASSWORD: "a".repeat(43),
    STAGING_ALLOWED_EMAILS: "allowed@example.test",
    LEGAL_APPROVED: "false",
    COMMERCIAL_APPROVED: "false",
    PRINT_SPEC_APPROVED: "false",
    CHECKOUT_ENABLED: "false",
    PRINT_ENABLED: "false",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    PRINT_API_URL: "",
    PRINT_API_KEY: "",
    TRANSCRIPTION_URL: "",
    TRANSCRIPTION_API_KEY: "",
    TRANSCRIPTION_MODEL: "",
  }))
    vi.stubEnv(name, value);
}
it("lets the allowed account sign in and blocks outsiders before queueing email", async () => {
  privateStaging();
  await expect(requestLogin("outsider@example.test")).rejects.toMatchObject({
    status: 403,
  });
  expect(
    (await pool().query("SELECT count(*)::int AS n FROM login_tokens")).rows[0]
      .n,
  ).toBe(0);
  expect(
    (await pool().query("SELECT count(*)::int AS n FROM jobs")).rows[0].n,
  ).toBe(0);
  await requestLogin("allowed@example.test");
  const login = await consumeLogin(
    await newestEmailToken("allowed@example.test"),
  );
  expect((await currentAccount(login.session))?.email).toBe(
    "allowed@example.test",
  );
});
it("revokes existing sessions when an email is removed from staging access", async () => {
  await requestLogin("outsider@example.test");
  const login = await consumeLogin(
    await newestEmailToken("outsider@example.test"),
  );
  expect(await currentAccount(login.session)).not.toBeNull();
  privateStaging();
  expect(await currentAccount(login.session)).toBeNull();
});
it("rejects an already-issued login link and rolls back token consumption when access is revoked", async () => {
  await requestLogin("outsider@example.test");
  const token = await newestEmailToken("outsider@example.test");
  privateStaging();
  await expect(consumeLogin(token)).rejects.toMatchObject({ status: 403 });
  expect(
    (
      await pool().query(
        "SELECT used_at FROM login_tokens WHERE token_hash=$1",
        [hash(token)],
      )
    ).rows[0].used_at,
  ).toBeNull();
  expect(
    (await pool().query("SELECT count(*)::int AS n FROM accounts")).rows[0].n,
  ).toBe(0);
});
