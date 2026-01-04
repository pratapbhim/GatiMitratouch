

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import MeetingRoomClient from "./MeetingRoomClient";

export default async function MeetingPage({ params, searchParams }: { params: { meetingId: string } | Promise<{ meetingId: string }>, searchParams: { fromPreview?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin");
  }
  // Handle both Promise and direct object for params
  let meetingId: string | undefined;
  if (typeof (params as any).then === 'function') {
    const resolved = await (params as Promise<{ meetingId: string }>);
    meetingId = resolved.meetingId;
  } else {
    meetingId = (params as { meetingId: string }).meetingId;
  }
  if (!meetingId || meetingId === 'preview') {
    redirect('/dashboard');
  }
  // Await searchParams if it's a Promise (App Router server component)
  const resolvedSearchParams = typeof (searchParams as any)?.then === 'function' ? await searchParams : searchParams;
  const fromPreview = resolvedSearchParams?.fromPreview === 'true';
  // If not from preview, or if this is a reload (no navigation state), always redirect to preview
  if (typeof window !== 'undefined' ? !window.performance?.navigation?.type || !fromPreview : !fromPreview) {
    redirect(`/meeting/preview?meetingId=${meetingId}`);
  }
  // If fromPreview=true, render meeting room
  return <MeetingRoomClient meetingId={meetingId} />;
}
