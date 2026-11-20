import { afterEach, expect, it, vi } from "vitest";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { transcribeAudio } from "./transcription";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
function provider() {
  vi.stubEnv(
    "TRANSCRIPTION_URL",
    "https://api.groq.com/openai/v1/audio/transcriptions",
  );
  vi.stubEnv("TRANSCRIPTION_MODEL", "whisper-large-v3");
  vi.stubEnv("TRANSCRIPTION_API_KEY", "fixture-not-a-key");
}
it("sends the private audio bytes to the transcription endpoint without public URLs or translation", async () => {
  provider();
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ text: "یہ میری کہانی ہے۔" }));
  expect(await transcribeAudio(Buffer.from("fixture"), "audio/webm")).toBe(
    "یہ میری کہانی ہے۔",
  );
  const [url, request] = fetch.mock.calls[0];
  expect(url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
  expect(request?.redirect).toBe("error");
  const form = request?.body as FormData;
  expect(form.get("model")).toBe("whisper-large-v3");
  expect(form.get("response_format")).toBe("json");
  expect(form.has("url")).toBe(false);
  const audio = form.get("file") as File;
  expect(audio.name).toBe("recording.webm");
  expect(Buffer.from(await audio.arrayBuffer()).toString()).toBe("fixture");
});
it.each([{}, { text: "" }, { text: "   " }, { text: "a".repeat(100001) }])(
  "rejects an unusable provider response",
  async (body) => {
    provider();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));
    await expect(
      transcribeAudio(Buffer.from("fixture"), "audio/webm"),
    ).rejects.toMatchObject({ status: 502 });
  },
);
it("compresses large audio for the free upload limit and removes temporary copies on failure", async () => {
  provider();
  const before = (await readdir(tmpdir())).filter((name) =>
    name.startsWith("filemoire-transcription-"),
  );
  const samples = 12_000_000;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(36 + samples * 2, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(null, { status: 429 }));
  await expect(transcribeAudio(wav, "audio/wav")).rejects.toMatchObject({
    status: 502,
  });
  const file = (fetch.mock.calls[0][1]?.body as FormData).get("file") as File;
  expect(file.name).toBe("recording.mp3");
  expect(file.type).toBe("audio/mpeg");
  expect(file.size).toBeLessThan(24_000_000);
  expect(file.size).toBeGreaterThan(0);
  expect(wav.length).toBe(24_000_044);
  expect(
    (await readdir(tmpdir())).filter((name) =>
      name.startsWith("filemoire-transcription-"),
    ),
  ).toEqual(before);
}, 30000);
