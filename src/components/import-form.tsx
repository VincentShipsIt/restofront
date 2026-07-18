"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ImportForm({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [source, setSource] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source.trim()) return;
    router.push(`/create?source=${encodeURIComponent(source.trim())}`);
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border bg-card p-2 shadow-[0_18px_60px_-24px_rgba(68,40,20,0.28)] sm:flex-row",
        compact ? "max-w-2xl" : "max-w-xl",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
        <Globe2 className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          placeholder="Restaurant website or name"
          aria-label="Restaurant website or name"
        />
      </div>
      <Button type="submit" size="lg" className="h-11 shrink-0 rounded-xl">
        Build the preview
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
