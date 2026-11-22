"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, Select, FieldError, InlineAlert, Helper } from "./ui";
import { issueItem, returnItem, adjustStock } from "@/actions/inventory";

export function IssueForm({
  items,
  events,
}: {
  items: { id: string; name: string; available: number; unit: string }[];
  events: { id: string; title: string }[];
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [expected, setExpected] = useState("");
  const [eventId, setEventId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = items.find((i) => i.id === itemId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!selected) return setError("Choose an item.");
    if (quantity < 1) return setError("Quantity must be at least 1.");
    if (quantity > selected.available) {
      return setError(`Only ${selected.available} ${selected.unit} available — cannot issue ${quantity}.`);
    }
    if (!recipient.trim()) return setError("Name the recipient or team.");
    if (!expected) return setError("Set an expected return date.");
    startTransition(async () => {
      try {
        const res = await issueItem({
          itemId,
          quantity,
          recipientLabel: recipient.trim(),
          expectedReturnAt: new Date(expected).toISOString(),
          linkedEventId: eventId || undefined,
          notes: notes.trim() || undefined,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setDone(`Issued ${quantity} × ${selected.name} to ${recipient.trim()}. Availability updated.`);
        setQuantity(1);
        setRecipient("");
        setNotes("");
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="iss-item" required>Item</Label>
        <Select id="iss-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          {items.map((i) => (
            <option key={i.id} value={i.id} disabled={i.available === 0}>
              {i.name} — {i.available} available
            </option>
          ))}
        </Select>
        {selected ? <Helper>{selected.available} {selected.unit} currently free to issue.</Helper> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="iss-qty" required>Quantity</Label>
          <Input
            id="iss-qty"
            type="number"
            min={1}
            max={selected?.available ?? 1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="iss-ret" required>Expected return</Label>
          <Input id="iss-ret" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="iss-recip" required>Recipient / team</Label>
        <Input id="iss-recip" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. Soldering workshop — Meera" />
      </div>
      <div>
        <Label htmlFor="iss-event">Linked event</Label>
        <Select id="iss-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">No linked event</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="iss-notes">Notes</Label>
        <Input id="iss-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context" />
      </div>
      <FieldError>{error}</FieldError>
      {done ? <InlineAlert tone="success">{done}</InlineAlert> : null}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Issuing…" : "Issue items"}</Button>
    </form>
  );
}

export function ReturnForm({ allocationId }: { allocationId: string }) {
  const [condition, setCondition] = useState<"good" | "fair" | "damaged" | "retired">("good");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <InlineAlert tone="success">Returned.</InlineAlert>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Condition on return"
        value={condition}
        onChange={(e) => setCondition(e.target.value as typeof condition)}
        className="h-8 w-auto min-w-[110px] py-0 text-[12px]"
      >
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="damaged">Damaged</option>
        <option value="retired">Retired</option>
      </Select>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const res = await returnItem({ allocationId, conditionOnReturn: condition });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setDone(true);
            } catch (err) {
              setError((err as Error).message);
            }
          });
        }}
      >
        {pending ? "Returning…" : "Record return"}
      </Button>
      {error ? <FieldError>{error}</FieldError> : null}
      {condition === "damaged" || condition === "retired" ? (
        <p className="w-full text-[10.5px] text-mid">Damaged returns are written off the ledger, not restored to available stock.</p>
      ) : null}
    </div>
  );
}

export function AdjustForm({ items }: { items: { id: string; name: string; onHand: number }[] }) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!reason.trim() || reason.trim().length < 3) return setError("Give a short reason — it goes in the ledger.");
    startTransition(async () => {
      try {
        const res = await adjustStock({ itemId, delta, reason: reason.trim() });
        if (!res.ok) return setError(res.error);
        setDone("Stock adjusted. Movement recorded.");
        setReason("");
        setDelta(1);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="adj-item" required>Item</Label>
        <Select id="adj-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.name} — on hand {i.onHand}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="adj-delta" required>Change (+ receive / − adjust)</Label>
        <Input
          id="adj-delta"
          type="number"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
        />
        <Helper>Negative values cannot push stock below the allocated quantity or zero.</Helper>
      </div>
      <div>
        <Label htmlFor="adj-reason" required>Reason</Label>
        <Input id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New shipment received" />
      </div>
      <FieldError>{error}</FieldError>
      {done ? <InlineAlert tone="success">{done}</InlineAlert> : null}
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Recording…" : "Record adjustment"}
      </Button>
    </form>
  );
}
