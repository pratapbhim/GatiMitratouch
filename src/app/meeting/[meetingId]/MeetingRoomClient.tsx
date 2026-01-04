
"use client";
import MeetingRoom from "@/components/video/MeetingRoom";

export default function MeetingRoomClient({ meetingId }: { meetingId: string }) {
  return <MeetingRoom meetingId={meetingId} />;
}
