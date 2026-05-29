import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function JoinFamilyPage({ searchParams }: Props) {
  const { userId } = await auth();
  const { code } = await searchParams;

  if (!code) redirect("/travel-assistant");

  // If not signed in, send to sign-up with code preserved
  if (!userId) {
    redirect(`/sign-up?code=${encodeURIComponent(code)}&join=family`);
  }

  // Signed in — redirect to app with join param
  redirect(`/travel-assistant?joinFamily=${encodeURIComponent(code)}`);
}
