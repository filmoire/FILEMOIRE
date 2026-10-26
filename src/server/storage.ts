import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { config, configured } from "./config";
import { assert, seal, unseal } from "./security";
const keyPattern = /^[a-z0-9/-]+$/;
const client = () =>
  new S3Client({
    region: config().S3_REGION,
    endpoint: config().S3_ENDPOINT,
    forcePathStyle: !!config().S3_ENDPOINT,
    requestHandler: { connectionTimeout: 10000, socketTimeout: 60000 },
  });
function location(key: string) {
  assert(
    keyPattern.test(key) && !key.includes(".."),
    400,
    "Invalid object key",
  );
  return path.resolve(config().LOCAL_STORAGE_DIR, key);
}
export async function putObject(key: string, bytes: Buffer) {
  const encrypted = Buffer.from(seal({ base64: bytes.toString("base64") }));
  if (config().STORAGE_DRIVER === "s3")
    await client().send(
      new PutObjectCommand({
        Bucket: configured("S3_BUCKET"),
        Key: key,
        Body: encrypted,
        ContentType: "application/octet-stream",
        ServerSideEncryption: "AES256",
      }),
    );
  else {
    const file = location(key);
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, encrypted, { mode: 0o600 });
  }
}
export async function getObject(key: string) {
  let bytes: Buffer;
  if (config().STORAGE_DRIVER === "s3") {
    const r = await client().send(
      new GetObjectCommand({ Bucket: configured("S3_BUCKET"), Key: key }),
    );
    assert(r.Body, 404, "Fichier introuvable.");
    bytes = Buffer.from(await r.Body.transformToByteArray());
  } else bytes = await readFile(location(key));
  return Buffer.from(
    unseal<{ base64: string }>(bytes.toString()).base64,
    "base64",
  );
}
export async function deleteObject(key: string) {
  if (config().STORAGE_DRIVER === "s3")
    await client().send(
      new DeleteObjectCommand({ Bucket: configured("S3_BUCKET"), Key: key }),
    );
  else
    await unlink(location(key)).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") throw e;
    });
}
