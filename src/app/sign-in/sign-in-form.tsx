"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, LoaderCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not send link");
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-3xl border bg-card p-7 shadow-xl">
      <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
        {sent ? <Check className="size-5" /> : <Mail className="size-5" />}
      </span>
      <h1 className="font-display mt-5 text-5xl leading-none tracking-[-0.045em]">
        {sent ? "Check your inbox." : "Open your restaurant."}
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {sent
          ? `A secure sign-in link is on its way to ${email}.`
          : "Enter the owner email used when the website was claimed. No password needed."}
      </p>
      {!sent ? (
        <form onSubmit={submit} className="mt-7 space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@restaurant.com"
            className="h-11"
            required
          />
          {error ? (
            <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <Button className="h-11 w-full" disabled={loading}>
            {loading ? <LoaderCircle className="animate-spin" /> : null}
            Email me a secure link
            {!loading ? <ArrowRight /> : null}
          </Button>
        </form>
      ) : null}
      <div className="mt-6 border-t pt-5 text-center text-xs text-muted-foreground">
        No site yet?{" "}
        <Link href="/create" className="font-semibold text-foreground">
          Build a preview
        </Link>
      </div>
    </section>
  );
}
