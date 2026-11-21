import { requireRolePage } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { isNull } from "drizzle-orm";
import { Card, SectionTitle, StatusBadge, DataTable, Th, Td, DemoBadge } from "@/components/ui";
import { IssueForm, ReturnForm, AdjustForm } from "@/components/inventory-forms";
import { availableFor } from "@/lib/services/inventory";
import { BalanceSummary } from "@/components/balance-summary";

export const metadata = { title: "Admin · Inventory" };

export default async function AdminInventoryPage() {
  await requireRolePage("custodian", "admin");
  const items = db.select().from(schema.inventoryItems).all();
  const allocations = db.select().from(schema.resourceAllocations).all();
  const movements = db.select().from(schema.stockMovements).all();
  const events = db.select().from(schema.events).all().filter((e) => e.status === "published");
  const users = db.select().from(schema.users).all();
  const userById = new Map(users.map((u) => [u.id, u]));

  const active = allocations.filter((a) => !a.returnedAt);
  const now = Date.now();

  const rows = items.map((i) => {
    const available = availableFor(i.id);
    const allocated = active.filter((a) => a.itemId === i.id).reduce((s, a) => s + a.quantity, 0);
    return { item: i, available, allocated };
  });

  const totalOnHand = rows.reduce((s, r) => s + r.item.quantityOnHand, 0);
  const totalAvailable = rows.reduce((s, r) => s + Math.max(r.available, 0), 0);
  const totalAllocated = rows.reduce((s, r) => s + r.allocated, 0);

  return (
    <div className="max-w-[1180px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Core OS</p>
          <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Robotics inventory.</h1>
          <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
            Availability is derived: on-hand minus open allocations. Issues are transactional and a quantity that
            would oversubscribe stock is rejected in the server action, not just disabled in the form.
          </p>
        </div>
        <DemoBadge>Demo stock ledger</DemoBadge>
      </div>

      <BalanceSummary onHand={totalOnHand} available={totalAvailable} allocated={totalAllocated} />

      <div className="mt-7 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-4">
          <p className="eyebrow mb-2">Issue equipment</p>
          <IssueForm
            items={rows.map((r) => ({ id: r.item.id, name: r.item.name, available: Math.max(r.available, 0), unit: r.item.unit }))}
            events={events.map((e) => ({ id: e.id, title: e.title }))}
          />
        </Card>
        <Card className="p-4">
          <p className="eyebrow mb-2">Adjust stock</p>
          <AdjustForm
            items={rows.map((r) => ({ id: r.item.id, name: r.item.name, onHand: r.item.quantityOnHand }))}
          />
        </Card>
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow={`${items.length} items`} title="Item register" />
        <DataTable caption="Inventory register">
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>Identifier</Th>
              <Th>On hand</Th>
              <Th>Allocated</Th>
              <Th>Available</Th>
              <Th>Flags</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, available, allocated }) => (
              <tr key={item.id}>
                <Td>
                  <p className="font-medium">{item.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-mid">
                    {item.category} · {item.location}
                  </p>
                </Td>
                <Td className="font-mono text-[11px]">{item.identifier}</Td>
                <Td className="metric">{item.quantityOnHand} {item.unit}</Td>
                <Td className="metric">{allocated}</Td>
                <Td className="metric font-medium">{Math.max(available, 0)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {available <= item.lowStockThreshold ? <StatusBadge label="low stock" tone="outline" /> : null}
                    {allocated >= item.quantityOnHand ? <StatusBadge label="fully out" tone="outline" /> : null}
                    {item.condition !== "good" ? <StatusBadge label={item.condition} tone="outline" /> : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow="Open" title="Allocations & returns" />
        <div className="space-y-2.5">
          {active.length === 0 ? (
            <Card className="p-4 text-[13px] text-strong">No equipment is currently issued.</Card>
          ) : (
            active.map((a) => {
              const item = items.find((i) => i.id === a.itemId);
              const overdue = new Date(a.expectedReturnAt).getTime() < now;
              return (
                <Card key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium">{item?.name} · {a.quantity} {item?.unit}</p>
                    <p className="text-[11.5px] text-strong">
                      {a.recipientLabel} · issued {new Date(a.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·
                      expected {new Date(a.expectedReturnAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-mid">Issued by {userById.get(a.issuedById)?.displayName ?? a.issuedById}</p>
                  </div>
                  {overdue ? <StatusBadge label="overdue" tone="solid" /> : null}
                  <ReturnForm allocationId={a.id} />
                </Card>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow="Ledger" title="Stock movement history" />
        <DataTable caption="Stock movements">
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>Kind</Th>
              <Th>Delta</Th>
              <Th>Reason</Th>
              <Th>Actor</Th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><Td>No movements.</Td><Td /><Td /><Td /><Td /></tr>
            ) : (
              [...movements]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 12)
                .map((m) => (
                  <tr key={m.id}>
                    <Td className="text-[12.5px]">{items.find((i) => i.id === m.itemId)?.name ?? m.itemId}</Td>
                    <Td><StatusBadge label={m.kind} tone="outline" /></Td>
                    <Td className={`metric ${m.quantityDelta >= 0 ? "" : "text-strong"}`}>
                      {m.quantityDelta >= 0 ? "+" : ""}{m.quantityDelta}
                    </Td>
                    <Td className="text-[12px] text-strong">{m.reason}</Td>
                    <Td className="text-[12px]">{userById.get(m.actorId)?.displayName ?? m.actorId}</Td>
                  </tr>
                ))
            )}
          </tbody>
        </DataTable>
        <p className="mt-2 text-[11px] text-mid">
          Allocations (issues and returns) are tracked separately from stock movements; both are append-only history.
        </p>
      </div>
    </div>
  );
}
