import { LinkButton, StatusBadge } from "./ui";

export function LevelHeader({
  title,
  summary,
  outcomes,
  challengeHref,
}: {
  title: string;
  summary: string;
  outcomes: string[];
  challengeHref?: string;
}) {
  return (
    <header className="border-b border-line pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="Topic" tone="outline" />
            <StatusBadge label="Demo tutor" tone="neutral" />
          </div>
          <h1 className="h-serif mt-2.5 text-[26px] font-semibold tracking-[-0.03em] sm:text-[30px]">{title}</h1>
          <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">{summary}</p>
        </div>
        {challengeHref ? (
          <LinkButton href={challengeHref} variant="secondary" size="sm">
            Linked mini-project
          </LinkButton>
        ) : null}
      </div>
      {outcomes.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
          {outcomes.map((o) => (
            <li key={o} className="flex items-start gap-2 text-[11.5px] text-strong">
              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mid" />
              {o}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
