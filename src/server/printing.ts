import { z } from "zod";
import type { Project } from "@/lib/types";
import type { Account } from "./auth";
import { requireAdmin } from "./auth";
import { transaction } from "./db";
import { accessProject, bookHash, saveProject } from "./projects";
import { assert, id, unseal, audit } from "./security";
import { enqueue } from "./jobs";
export async function requestPrint(
  a: Account,
  projectId: string,
  input: unknown,
) {
  const v = z
    .object({
      revision: z.number().int().positive(),
      requestKey: z.string().uuid(),
    })
    .strict()
    .parse(input);
  assert(
    process.env.PRINT_ENABLED === "true" &&
      process.env.PRINT_SPEC_APPROVED === "true" &&
      !!process.env.PRINT_SPEC_VERSION,
    503,
    "L’impression attend la validation du fournisseur et de l’épreuve.",
  );
  return transaction(async (db) => {
    const row = await accessProject(db, a, projectId, true);
    assert(row.role === "narrator" && !row.deletion_at, 403, "Accès refusé.");
    assert(
      row.kind === "purchased",
      403,
      "Ce manuscrit personnel ne comprend aucune commande d’impression.",
    );
    const existing = await db.query(
      "SELECT id FROM print_orders WHERE request_key=$1 AND project_id=$2",
      [v.requestKey, projectId],
    );
    if (existing.rows[0]) return existing.rows[0];
    assert(row.revision === v.revision, 409, "Le livre a changé.");
    const p = unseal<Project>(row.payload);
    assert(
      p.book.status === "approuve" && p.print.address,
      409,
      "Validez le livre et l’adresse.",
    );
    const version = (
      await db.query(
        "SELECT id,content_hash FROM book_versions WHERE project_id=$1 AND approved_by=$2 AND approved_at IS NOT NULL ORDER BY revision DESC LIMIT 1",
        [projectId, a.id],
      )
    ).rows[0];
    assert(
      version && version.content_hash === bookHash(p),
      409,
      "Version approuvée introuvable.",
    );
    const payment = (
      await db.query(
        "SELECT status,refund_requested,production_committed FROM orders WHERE id=$1 FOR UPDATE",
        [p.orderId],
      )
    ).rows[0];
    assert(
      payment?.status === "paid" &&
        !payment.refund_requested &&
        !payment.production_committed,
      409,
      "Paiement ou production déjà en cours de traitement. Contactez le support.",
    );
    await db.query("UPDATE orders SET production_committed=true WHERE id=$1", [
      p.orderId,
    ]);
    const printId = id();
    await db.query(
      "INSERT INTO print_orders(id,project_id,version_id,request_key) VALUES($1,$2,$3,$4)",
      [printId, projectId, version.id, v.requestKey],
    );
    p.book.status = "preparation";
    await saveProject(db, a, row, p);
    await enqueue(
      db,
      "print",
      { printId, specVersion: process.env.PRINT_SPEC_VERSION },
      `print:${printId}`,
    );
    return { id: printId };
  });
}
export async function updatePrint(a: Account, printId: string, input: unknown) {
  requireAdmin(a);
  const v = z
    .object({
      status: z.enum(["impression", "expedie", "livre", "incident"]),
      tracking: z.string().max(200).optional(),
      incident: z.string().max(1000).optional(),
    })
    .strict()
    .parse(input);
  await transaction(async (db) => {
    const { rows } = await db.query(
      "SELECT * FROM print_orders WHERE id=$1 FOR UPDATE",
      [printId],
    );
    const print = rows[0];
    assert(print, 404, "Commande introuvable.");
    const result = await db.query(
      "SELECT * FROM projects WHERE id=$1 FOR UPDATE",
      [print.project_id],
    );
    const row = result.rows[0];
    assert(row, 404, "Livre introuvable.");
    const p = unseal<Project>(row.payload);
    const next: Record<string, string> = {
      preparation: "impression",
      impression: "expedie",
      expedie: "livre",
    };
    assert(
      v.status === "incident" || next[p.book.status] === v.status,
      409,
      "Transition de production invalide.",
    );
    if (v.status === "expedie")
      assert(v.tracking, 400, "Référence de suivi requise.");
    if (v.status === "incident")
      p.print.incident = v.incident || "Incident à traiter";
    else {
      p.book.status = v.status;
      p.print.tracking = v.tracking ?? p.print.tracking;
      p.print.incident = undefined;
    }
    p.print.events.push({
      at: Date.now(),
      status: v.status,
      note: v.incident ?? v.tracking ?? v.status,
      by: "Filémoire",
    });
    await db.query(
      "UPDATE print_orders SET status=$2,tracking=COALESCE($3,tracking),incident=$4 WHERE id=$1",
      [printId, v.status, v.tracking ?? null, v.incident ?? null],
    );
    await saveProject(db, a, row, p);
    await audit(db, a.id, row.id, "print.updated");
  });
}
