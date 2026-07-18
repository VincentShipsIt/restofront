import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({
  inverse = false,
  className,
}: {
  inverse?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em]",
        inverse ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full border text-[11px] font-bold tracking-[-0.08em]",
          inverse
            ? "border-white/30 bg-white/10 text-white"
            : "border-primary/25 bg-primary text-primary-foreground",
        )}
      >
        RF
      </span>
      Restofront
    </Link>
  );
}
