import { createServer } from "node:http";
import { test, expect } from "@playwright/test";
import {
  configureTests,
  resetTests,
  closeTestDatabase,
  book,
  answer,
  newestEmailToken,
} from "./helpers";
import { requestLogin } from "../../src/server/auth";
import { beginUpload, uploadPart, finishUpload } from "../../src/server/media";
import { pool } from "../../src/server/db";
import { id, unseal } from "../../src/server/security";
import { runJob } from "../../src/server/worker";

test.beforeAll(configureTests);
test.beforeEach(resetTests);
test.afterAll(closeTestDatabase);

test("saved audio transcription appears automatically and persists only after narrator review", async ({
  page,
}) => {
  // A local provider fixture exercises real upload/storage, queue, worker, HTTP,
  // database and browser polling. Provider speech accuracy is tested separately.
  const provider = createServer((request, response) => {
    request.resume();
    request.on("end", () => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          text: "Ma grand-mère cultivait des roses dans son jardin.",
        }),
      );
    });
  });
  await new Promise<void>((resolve) =>
    provider.listen(0, "127.0.0.1", resolve),
  );
  const address = provider.address() as { port: number };
  const savedEnv = [
    "TRANSCRIPTION_URL",
    "TRANSCRIPTION_API_KEY",
    "TRANSCRIPTION_MODEL",
  ].map((key) => [key, process.env[key]] as const);
  process.env.TRANSCRIPTION_URL = `http://127.0.0.1:${address.port}`;
  process.env.TRANSCRIPTION_API_KEY = "local-fixture";
  process.env.TRANSCRIPTION_MODEL = "fixture";
  try {
    const b = await book();
    const view = await answer(b);
    const bytes = Buffer.alloc(16044);
    bytes.write("RIFF");
    bytes.writeUInt32LE(16036, 4);
    bytes.write("WAVE", 8);
    bytes.write("fmt ", 12);
    bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(8000, 24);
    bytes.writeUInt32LE(16000, 28);
    bytes.writeUInt16LE(2, 32);
    bytes.writeUInt16LE(16, 34);
    bytes.write("data", 36);
    bytes.writeUInt32LE(16000, 40);
    const upload = await beginUpload(b.narrator, b.projectId, {
      memoryId: view.project.memories[0].id,
      kind: "audio",
      mime: "audio/wav",
      bytes: bytes.length,
    });
    await uploadPart(b.narrator, upload.id, 0, bytes);
    await finishUpload(b.narrator, upload.id);
    await requestLogin(b.narrator.email);
    await page.goto(`/acces#token=${await newestEmailToken(b.narrator.email)}`);
    await page.getByRole("button", { name: "Confirmer ma connexion" }).click();
    await expect(
      page.getByText("Votre transcription est en préparation.", {
        exact: false,
      }),
    ).toBeVisible();
    const job = (
      await pool().query("SELECT * FROM jobs WHERE kind='transcribe'")
    ).rows[0];
    await runJob({
      id: job.id,
      kind: job.kind,
      payload: unseal(job.payload),
      attempts: 1,
      lock: id(),
    });
    const text = page.getByRole("textbox", {
      name: "Texte à relire",
      exact: true,
    });
    await expect(text).toHaveValue(
      "Ma grand-mère cultivait des roses dans son jardin.",
    );
    await expect(
      page.getByRole("button", { name: "Ajouter au récit", exact: true }),
    ).toBeDisabled();
    await text.fill(
      "Ma grand-mère cultivait des roses rouges dans son jardin.",
    );
    await page
      .getByRole("button", { name: "Valider ma transcription", exact: true })
      .click();
    await expect(
      page.getByText("Transcription validée.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("textbox", { name: "Texte à relire", exact: true }),
    ).toHaveValue("Ma grand-mère cultivait des roses rouges dans son jardin.");
    await expect(
      page.getByRole("button", { name: "Ajouter au récit", exact: true }),
    ).toBeEnabled();
  } finally {
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await new Promise<void>((resolve, reject) =>
      provider.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
