"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { getSession } from "next-auth/react";
import MeetingPreview from "@/components/meeting/MeetingPreview";

export default function MeetingPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    getSession().then((session) => {
      if (!session?.user) {
        router.replace("/api/auth/signin");
      } else {
        setUser(session.user);
      }
    });
  }, [router]);

  const meetingId = searchParams.get("meetingId") || "";
  React.useEffect(() => {
    if (!meetingId || meetingId === "preview") {
      router.replace("/dashboard");
    }
  }, [meetingId, router]);
  const handleJoin = () => {
    if (meetingId && meetingId !== "preview") {
      router.replace(`/meeting/${meetingId}?fromPreview=true`);
    } else {
      router.replace("/dashboard");
    }
  };

  if (!user) return null;

  return <MeetingPreview user={user} onJoin={handleJoin} />;
}
