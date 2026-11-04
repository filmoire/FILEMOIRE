// Encrypt only a verified backup's allowlisted files. The production data key
// and age private key are never inputs to the archive or encryption process.
import { lstat, realpath, readFile, open, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

export async function backupEntries(folder) {
  const root = await realpath(folder);
  async function regular(relative) {
    const file = path.join(root, relative);
    const stat = await lstat(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      (await realpath(file)) !== file
    )
      throw new Error("Backup entries must be regular files without symlinks");
    return stat;
  }
  await regular("manifest.json");
  const manifest = JSON.parse(
    await readFile(path.join(root, "manifest.json"), "utf8"),
  );
  if (manifest.status !== "passed" || !Array.isArray(manifest.objects))
    throw new Error("A verified backup manifest is required");
  if ((await regular("database.dump")).size === 0)
    throw new Error("Database dump is empty");
  const entries = ["database.dump", "manifest.json"];
  for (const object of manifest.objects) {
    if (
      typeof object.key !== "string" ||
      !/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(object.key)
    )
      throw new Error("Unsafe backup object key");
    const relative = `objects/${object.key}`;
    if (entries.includes(relative)) throw new Error("Duplicate backup object");
    const stat = await regular(relative);
    const hash = createHash("sha256")
      .update(await readFile(path.join(root, relative)))
      .digest("hex");
    if (stat.size !== object.bytes || hash !== object.sha256)
      throw new Error("Backup object integrity failed");
    entries.push(relative);
  }
  return { root, entries };
}

const completion = (child) =>
  new Promise((resolve, reject) => {
    child.once("error", () =>
      reject(new Error("Required archive tool could not start")),
    );
    child.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error("Archive encryption failed")),
    );
  });

export async function archiveBackup(folder, output, recipient) {
  if (!/^age1[0-9a-z]{58}$/.test(recipient || ""))
    throw new Error("Provide an age public recipient, never a private key");
  const { root, entries } = await backupEntries(folder);
  const parent = await realpath(path.dirname(path.resolve(output)));
  if (parent === root || parent.startsWith(root + path.sep))
    throw new Error("Store the archive outside the source backup");
  const file = await open(output, "wx", 0o600);
  let tar, age;
  try {
    // No recursive directory inclusion, no plaintext intermediate archive, and
    // no raw provider/CLI error output (which may contain private paths).
    tar = spawn("tar", ["-czf", "-", "-C", root, "--", ...entries], {
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, COPYFILE_DISABLE: "1" },
    });
    age = spawn("age", ["--encrypt", "--recipient", recipient], {
      stdio: ["pipe", file.fd, "ignore"],
    });
    await Promise.all([
      completion(tar),
      completion(age),
      pipeline(tar.stdout, age.stdin),
    ]);
    await file.sync();
    return { files: entries.length };
  } catch {
    tar?.kill();
    age?.kill();
    await unlink(output).catch(() => {});
    throw new Error(
      "Archive failed; partial output removed. Check age/tar installation and recipient.",
    );
  } finally {
    await file.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const [folder, output] = process.argv.slice(2);
    if (!folder || !output) throw new Error("Arguments required");
    const result = await archiveBackup(
      folder,
      output,
      process.env.BACKUP_AGE_RECIPIENT,
    );
    console.log(
      `PASS encrypted backup archive: ${result.files} allowlisted files; keys excluded. Upload/schedule and key-vault recovery still require configuration.`,
    );
  } catch {
    console.error(
      "Backup archive failed. Check source, output and public recipient; no secrets were logged.",
    );
    process.exitCode = 1;
  }
}
