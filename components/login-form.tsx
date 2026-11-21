"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signInWithPassword, type AuthState } from "@/actions/session";
import { Button, FieldError, Input, Label } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signInWithPassword, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="email" required>
          Email address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@guwahatiuniversity.ac.in"
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      <div>
        <Label htmlFor="password" required>
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={10}
          maxLength={200}
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      {state.error ? <FieldError>{state.error}</FieldError> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          "Signing in…"
        ) : (
          <>
            Sign in <ArrowRight size={16} aria-hidden />
          </>
        )}
      </Button>
      <p className="text-center text-[12px] leading-relaxed text-mid">
        Use the account issued by your AURA coordinator. Sign-in is rate-limited and sessions expire after 14 days.
      </p>
    </form>
  );
}
