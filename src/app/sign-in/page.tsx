import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { SignInForm } from "@/app/sign-in/sign-in-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="min-h-screen">
      <header className="flex h-16 items-center gap-4 border-b px-5">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/">
            <ArrowLeft />
          </Link>
        </Button>
        <Brand />
      </header>
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-16">
        <SignInForm />
      </div>
    </main>
  );
}
