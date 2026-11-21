import { db, schema } from "../db/client";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Availability = quantity_on_hand − sum(quantity of open allocations).
 * Derived, never stored, so it cannot drift from the ledger.
 */
export function availableFor(itemId: string): number {
  const item = db
    .select()
    .from(schema.inventoryItems)
    .where(eq(schema.inventoryItems.id, itemId))
    .all()[0];
  if (!item) return 0;
  const active = db
    .select()
    .from(schema.resourceAllocations)
    .where(and(eq(schema.resourceAllocations.itemId, itemId), isNull(schema.resourceAllocations.returnedAt)))
    .all();
  return item.quantityOnHand - active.reduce((sum, a) => sum + a.quantity, 0);
}

export function listInventoryWithAvailability() {
  const items = db.select().from(schema.inventoryItems).all();
  return items.map((item) => ({ item, available: availableFor(item.id) }));
}
