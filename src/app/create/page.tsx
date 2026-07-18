import type { Metadata } from "next";
import { ImportStudio } from "@/app/create/import-studio";

export const metadata: Metadata = {
  title: "Build a restaurant preview",
  robots: { index: false, follow: false },
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source = "" } = await searchParams;
  return <ImportStudio initialSource={source} />;
}
