import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTopic, getQuestions, getChallengeForTopic, getTutorMessages, safeJson } from "@/lib/services/catalog";
import { TutorPanel, type PersistedTurn } from "@/components/tutor-panel";
import { LevelHeader } from "@/components/level-header";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const t = getTopic(topicId);
  return { title: t ? `Tutor · ${t.title}` : "Tutor" };
}

export default async function TutorTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const user = await requireUser();
  const topic = getTopic(topicId);
  if (!topic || !topic.published) notFound();

  const questions = getQuestions(topicId);
  const challenge = getChallengeForTopic(topicId);
  const messages = getTutorMessages(user.id, topicId);

  const turns: PersistedTurn[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    level: m.level,
    mode: m.mode,
    createdAt: m.createdAt,
    helpful: m.helpful,
  }));

  return (
    <div className="max-w-[1200px]">
      <nav aria-label="Breadcrumb" className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mid">
        <Link href="/app/tutor" className="hover:text-ink">AI Tutor</Link>
        <span aria-hidden className="mx-2">/</span>
        <span className="text-ink">{topic.title}</span>
      </nav>

      <LevelHeader
        title={topic.title}
        summary={topic.summary}
        outcomes={safeJson<string[]>(topic.outcomes, [])}
        challengeHref={challenge ? `/app/projects?challenge=${challenge.id}` : undefined}
      />

      <div className="mt-7">
        <TutorPanel
          topicId={topic.id}
          topicTitle={topic.title}
          initialLevel={user.preferredLevel}
          initialTurns={turns}
          questions={questions}
          hasChallenge={!!challenge}
        />
      </div>
    </div>
  );
}
