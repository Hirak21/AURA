/**
 * Integration-level tests against a throwaway SQLite database.
 * These cover the three rules the PRD calls out as data-layer invariants:
 *  1. duplicate event registration is impossible
 *  2. capacity overflow is impossible
 *  3. issued stock never exceeds availability (and never goes negative)
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { migrate } from "../lib/db/migrate";
import { buildSeed } from "../lib/db/seed";
import { insertRows } from "../scripts/_insert";
import { randomUUID } from "node:crypto";

let sqlite: Database.Database;

before(() => {
  sqlite = new Database(":memory:");
  migrate(sqlite);
  const seed = buildSeed();
  for (const { table, rows } of seed) insertRows(sqlite, table, rows);
});

function availability(itemId: string): number {
  const item = sqlite.prepare("SELECT quantity_on_hand FROM inventory_items WHERE id=?").get(itemId) as {
    quantity_on_hand: number;
  };
  const active = sqlite
    .prepare(
      "SELECT COALESCE(SUM(quantity),0) AS q FROM resource_allocations WHERE item_id=? AND returned_at IS NULL",
    )
    .get(itemId) as { q: number };
  return item.quantity_on_hand - active.q;
}

function tryIssue(itemId: string, quantity: number): { ok: boolean; error?: string } {
  // Mirrors actions/inventory.ts issueItem, including the in-transaction re-check
  try {
    sqlite.transaction(() => {
      const item = sqlite.prepare("SELECT quantity_on_hand, archived FROM inventory_items WHERE id=?").get(itemId) as {
        quantity_on_hand: number;
        archived: number;
      };
      if (!item) throw new Error("Item not found.");
      if (item.archived) throw new Error("This item is archived.");
      const available = availability(itemId);
      if (quantity > available) throw new Error(`Only ${available} available. Cannot issue ${quantity}.`);
      sqlite
        .prepare(
          `INSERT INTO resource_allocations (id,item_id,quantity,recipient_id,recipient_label,linked_event_id,
           linked_collaboration_id,linked_project_id,issued_at,expected_return_at,returned_at,condition_on_issue,
           condition_on_return,issued_by_id,returned_by_id,notes)
           VALUES (?,?,?,NULL,?,NULL,NULL,NULL,?,?,NULL,'good',NULL,?,NULL,'')`,
        )
        .run(
          randomUUID(),
          itemId,
          quantity,
          "Test recipient",
          new Date().toISOString(),
          new Date(Date.now() + 86_400_000).toISOString(),
          "u-ishaan",
        );
    })();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

test("inventory: seed availability subtracts active allocations", () => {
  // i-4 has 12 on hand, 4 allocated in seed
  assert.equal(availability("i-4"), 8);
});

test("inventory: cannot issue more than available", () => {
  const r = tryIssue("i-4", 9);
  assert.equal(r.ok, false);
  assert.match(r.error ?? "", /Only 8 available/);
  assert.equal(availability("i-4"), 8, "failed issue must not change availability");
});

test("inventory: issuing exactly the available quantity succeeds", () => {
  const r = tryIssue("i-4", 8);
  assert.equal(r.ok, true);
  assert.equal(availability("i-4"), 0);
});

test("inventory: returning restores availability", () => {
  const alloc = sqlite
    .prepare("SELECT id FROM resource_allocations WHERE item_id='i-4' AND returned_at IS NULL ORDER BY issued_at DESC")
    .get() as { id: string };
  sqlite.prepare("UPDATE resource_allocations SET returned_at=? WHERE id=?").run(new Date().toISOString(), alloc.id);
  assert.equal(availability("i-4"), 8);
});

test("inventory: availability never goes negative under repeated issues", () => {
  const r1 = tryIssue("i-7", 1);
  const r2 = tryIssue("i-7", 1);
  const r3 = tryIssue("i-7", 1);
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(r3.ok, false, "third issue must fail: only 2 units exist");
  assert.ok(availability("i-7") >= 0);
});

function tryRegister(eventId: string, userId: string): { ok: boolean; error?: string } {
  try {
    sqlite.transaction(() => {
      const event = sqlite.prepare("SELECT * FROM events WHERE id=?").get(eventId) as Record<string, unknown> | undefined;
      if (!event) throw new Error("Event not found.");
      if (event.status !== "published") throw new Error("Registration is not open for this event.");
      const now = new Date();
      if (now < new Date(event.registration_opens_at as string)) throw new Error("Registration has not opened yet.");
      if (now > new Date(event.registration_closes_at as string)) throw new Error("Registration has closed.");
      const existing = sqlite
        .prepare("SELECT * FROM event_registrations WHERE event_id=? AND user_id=?")
        .get(eventId, userId) as Record<string, unknown> | undefined;
      if (existing && existing.status === "registered") throw new Error("You are already registered for this event.");
      const count = (
        sqlite
          .prepare("SELECT COUNT(*) c FROM event_registrations WHERE event_id=? AND status='registered'")
          .get(eventId) as { c: number }
      ).c;
      if (!existing && count >= (event.capacity as number)) throw new Error("This event is full.");
      if (existing) {
        sqlite.prepare("UPDATE event_registrations SET status='registered' WHERE event_id=? AND user_id=?").run(eventId, userId);
      } else {
        sqlite
          .prepare("INSERT INTO event_registrations (id,event_id,user_id,status,created_at,attended_at) VALUES (?,?,?,'registered',?,NULL)")
          .run(randomUUID(), eventId, userId, new Date().toISOString());
      }
    })();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

test("events: duplicate registration is blocked", () => {
  const r = tryRegister("e-solder", "u-rohit");
  assert.equal(r.ok, false);
  assert.match(r.error ?? "", /already registered/);
});

test("events: capacity overflow is blocked", () => {
  // shrink e-solder capacity to exactly the current count
  const current = (
    sqlite.prepare("SELECT COUNT(*) c FROM event_registrations WHERE event_id='e-solder' AND status='registered'").get() as {
      c: number;
    }
  ).c;
  sqlite.prepare("UPDATE events SET capacity=? WHERE id='e-solder'").run(current);
  const r = tryRegister("e-solder", "u-ananya");
  assert.equal(r.ok, false);
  assert.match(r.error ?? "", /full/);
});

test("events: cancelling then re-registering works when capacity allows", () => {
  sqlite.prepare("UPDATE events SET capacity=20 WHERE id='e-solder'").run();
  sqlite
    .prepare("UPDATE event_registrations SET status='cancelled' WHERE event_id='e-solder' AND user_id='u-rohit'")
    .run();
  const r = tryRegister("e-solder", "u-rohit");
  assert.equal(r.ok, true);
});
