// AI‑Assisted Help – demo implementation (client only)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type Message = { role: "user" | "assistant"; content: string };

export function AiAssist({ topicId }: { topicId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  async function mockLLM(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          `👋 Hey! I’m a demo AI. Here’s a quick hint for **${prompt}**:\n` +
            `• Break the concept into 3 steps.\n` +
            `• Try an example from the “Practice” section.\n` +
            `• If you get stuck, check the “Explanation” tab.\n` +
            `*(Replace this with a real LLM response when an API key is added.)*`
        );
      }, 800);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    const placeholder: Message = { role: "assistant", content: "🧠 Thinking…" };
    setMessages((m) => [...m, placeholder]);
    try {
      const answer = await mockLLM(input);
      setMessages((m) => {
        const without = m.filter((msg) => msg !== placeholder);
        return [...without, { role: "assistant", content: answer }];
      });
    } catch {
      setMessages((m) => {
        const without = m.filter((msg) => msg !== placeholder);
        return [...without, { role: "assistant", content: "❌ Demo AI failed. Try again later." }];
      });
    }
    setInput("");
  }

  return (
    <div data-topic-id={topicId} className="mt-8 rounded-card border border-line bg-mist p-4">
      <h3 className="mb-3 text-[15px] font-semibold">AI‑Assisted Help <span className="font-normal text-mid">(demo)</span></h3>
      <div className="max-h-48 overflow-y-auto rounded border border-line bg-paper p-3 text-[13px] leading-relaxed">
        {messages.length === 0 && <p className="text-mid">Ask a question about the topic.</p>}
        {messages.map((msg, i) => (
          <p key={i} className={msg.role === "assistant" ? "text-ink" : "font-medium"}>
            <strong>{msg.role === "assistant" ? "AI" : "You"}:</strong> {msg.content}
          </p>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded border border-line px-3 py-1.5 text-sm"
          placeholder="e.g. ‘Explain the difference between …’"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" size="sm" variant="primary">
          Ask
        </Button>
      </form>
    </div>
  );
}
