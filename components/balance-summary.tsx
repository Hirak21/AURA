import { Card } from "./ui";

export function BalanceSummary({
  onHand,
  available,
  allocated,
}: {
  onHand: number;
  available: number;
  allocated: number;
}) {
  const cells = [
    ["On hand", onHand, "units recorded in stock"],
    ["Allocated", allocated, "issued and not yet returned"],
    ["Available", available, "free to issue now"],
  ] as const;
  return (
    <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
      {cells.map(([label, value, sub]) => (
        <Card key={label} className="p-3 sm:p-4">
          <p className="eyebrow text-[10px] sm:text-[11px]">{label}</p>
          <p className="metric mt-1.5 text-[20px] font-medium leading-none sm:text-[24px]">{value}</p>
          <p className="mt-1.5 text-[10.5px] leading-snug text-strong sm:text-[11px]">{sub}</p>
        </Card>
      ))}
    </div>
  );
}
