"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { registerWithInvite, type AuthState } from "@/actions/session";
import { Button, FieldError, Input, Label } from "./ui";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(registerWithInvite, {});
  const invalid = state.error ? true : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="code" required>
          Invite code
        </Label>
        <Input
          id="code"
          name="code"
          required
          minLength={8}
          maxLength={64}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="AURA-XXXX-XXXX"
          aria-invalid={invalid}
          className="font-mono uppercase tracking-widest"
        />
      </div>
      <div>
        <Label htmlFor="name" required>
          Full name
        </Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          placeholder="Your name"
          aria-invalid={invalid}
        />
      </div>
      <div>
        <Label htmlFor="email" required>
          Email address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          aria-invalid={invalid}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="password" required>
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={200}
            autoComplete="new-password"
            aria-invalid={invalid}
          />
        </div>
        <div>
          <Label htmlFor="confirm" required>
            Confirm password
          </Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={10}
            maxLength={200}
            autoComplete="new-password"
            aria-invalid={invalid}
          />
        </div>
      </div>
      {state.error ? <FieldError>{state.error}</FieldError> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          "Creating account…"
        ) : (
          <>
            Create account <ArrowRight size={16} aria-hidden />
          </>
        )}
      </Button>
      <p className="text-center text-[12px] leading-relaxed text-mid">
        Registration requires an invite code from your AURA coordinator. New accounts are students only;
        staff roles are granted separately.
      </p>
    </form>
  );
}
