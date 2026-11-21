"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseOrThrow } from "@/lib/domain/schemas";
import { db, schema } from "@/lib/db/client";
import { requireRole } from "@/lib/auth";
import { and, eq, isNull } from "drizzle-orm";
import { availableFor } from "@/lib/services/inventory";

/**
 * Issue/return run inside a SQLite transaction with a re-check inside the txn,
 * so two concurrent issues cannot drive availability negative.
 * The derived-availability helper lives in lib/services/inventory.ts.
 */

const issueSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
  recipientLabel: z.string().min(2, "Name who is receiving the items.").max(120),
  expectedReturnAt: z.string().min(1),
  linkedEventId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function issueItem(input: z.infer<typeof issueSchema>) {
  const custodian = await requireRole("custodian", "admin");
  const data = parseOrThrow(issueSchema, input);

  if (new Date(data.expectedReturnAt) <= new Date()) {
    throw new Error("Expected return date must be in the future.");
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  try {
    db.transaction((tx) => {
      const item = tx.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, data.itemId)).all()[0];
      if (!item) throw new Error("Item not found.");
      if (item.archived) throw new Error("This item is archived.");

      const active = tx
        .select()
        .from(schema.resourceAllocations)
        .where(and(eq(schema.resourceAllocations.itemId, data.itemId), isNull(schema.resourceAllocations.returnedAt)))
        .all();
      const available = item.quantityOnHand - active.reduce((s, a) => s + a.quantity, 0);

      if (data.quantity > available) {
        throw new Error(`Only ${available} available. Cannot issue ${data.quantity}.`);
      }

      tx.insert(schema.resourceAllocations)
        .values({
          id,
          itemId: data.itemId,
          quantity: data.quantity,
          recipientId: null,
          recipientLabel: data.recipientLabel,
          linkedEventId: data.linkedEventId || null,
          linkedCollaborationId: null,
          linkedProjectId: null,
          issuedAt: now,
          expectedReturnAt: data.expectedReturnAt,
          returnedAt: null,
          conditionOnIssue: item.condition,
          conditionOnReturn: null,
          issuedById: custodian.id,
          returnedById: null,
          notes: data.notes ?? "",
        })
        .run();

      tx.insert(schema.auditEvents)
        .values({
          id: randomUUID(),
          actorId: custodian.id,
          action: "inventory.issued",
          entityType: "resource_allocation",
          entityId: id,
          metadataJson: JSON.stringify({ itemId: data.itemId, quantity: data.quantity }),
          createdAt: now,
        })
        .run();
    });
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Issue failed." };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return { ok: true as const, allocationId: id };
}

const returnSchema = z.object({
  allocationId: z.string().min(1),
  conditionOnReturn: z.enum(["good", "fair", "damaged", "retired"]),
});

export async function returnItem(input: z.infer<typeof returnSchema>) {
  const custodian = await requireRole("custodian", "admin");
  const data = parseOrThrow(returnSchema, input);
  const now = new Date().toISOString();

  try {
    db.transaction((tx) => {
      const allocation = tx
        .select()
        .from(schema.resourceAllocations)
        .where(eq(schema.resourceAllocations.id, data.allocationId))
        .all()[0];
      if (!allocation) throw new Error("Allocation not found.");
      if (allocation.returnedAt) throw new Error("This allocation was already returned.");

      tx.update(schema.resourceAllocations)
        .set({
          returnedAt: now,
          returnedById: custodian.id,
          conditionOnReturn: data.conditionOnReturn,
        })
        .where(eq(schema.resourceAllocations.id, data.allocationId))
        .run();

      // Damaged returns are written off the ledger, not silently restored.
      if (data.conditionOnReturn === "damaged" || data.conditionOnReturn === "retired") {
        const item = tx
          .select()
          .from(schema.inventoryItems)
          .where(eq(schema.inventoryItems.id, allocation.itemId))
          .all()[0];
        if (!item) throw new Error("Item not found.");
        if (allocation.quantity > item.quantityOnHand) {
          throw new Error("Return quantity exceeds recorded stock.");
        }
        tx.update(schema.inventoryItems)
          .set({ quantityOnHand: item.quantityOnHand - allocation.quantity, condition: "damaged" })
          .where(eq(schema.inventoryItems.id, allocation.itemId))
          .run();
        tx.insert(schema.stockMovements)
          .values({
            id: randomUUID(),
            itemId: allocation.itemId,
            kind: "damaged",
            quantityDelta: -allocation.quantity,
            actorId: custodian.id,
            reason: `Returned damaged from allocation ${allocation.id}`,
            createdAt: now,
          })
          .run();
      }

      tx.insert(schema.auditEvents)
        .values({
          id: randomUUID(),
          actorId: custodian.id,
          action: "inventory.returned",
          entityType: "resource_allocation",
          entityId: data.allocationId,
          metadataJson: JSON.stringify({ condition: data.conditionOnReturn }),
          createdAt: now,
        })
        .run();
    });
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Return failed." };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return { ok: true as const };
}

const stockSchema = z.object({
  itemId: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().min(3, "Give a short reason for the stock movement.").max(200),
});

export async function adjustStock(input: z.infer<typeof stockSchema>) {
  const custodian = await requireRole("custodian", "admin");
  const data = parseOrThrow(stockSchema, input);

  try {
    db.transaction((tx) => {
      const item = tx.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, data.itemId)).all()[0];
      if (!item) throw new Error("Item not found.");
      const next = item.quantityOnHand + data.delta;
      if (next < 0) throw new Error("Stock cannot go negative.");

      const active = tx
        .select()
        .from(schema.resourceAllocations)
        .where(and(eq(schema.resourceAllocations.itemId, data.itemId), isNull(schema.resourceAllocations.returnedAt)))
        .all();
      const allocated = active.reduce((s, a) => s + a.quantity, 0);
      if (next - allocated < 0) throw new Error("Adjustment would put on-hand stock below the allocated quantity.");

      tx.update(schema.inventoryItems).set({ quantityOnHand: next }).where(eq(schema.inventoryItems.id, data.itemId)).run();
      tx.insert(schema.stockMovements)
        .values({
          id: randomUUID(),
          itemId: data.itemId,
          kind: data.delta >= 0 ? "received" : "adjusted",
          quantityDelta: data.delta,
          actorId: custodian.id,
          reason: data.reason,
          createdAt: new Date().toISOString(),
        })
        .run();
    });
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Adjustment failed." };
  }

  revalidatePath("/admin/inventory");
  return { ok: true as const };
}
