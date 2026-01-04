"use client";
import { useState } from "react";
import Link from "next/link";

export default function DashboardClient({ userName }: { userName: string }) {
  const [meetingId, setMeetingId] = useState("");
  const [error, setError] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  // Generate meeting ID only on click
  const handleStartMeeting = () => {
    const id = crypto.randomUUID();
    window.location.href = `/meeting?meetingId=${id}`;
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Welcome, {userName}!</h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          className="bg-green-600 text-white px-6 py-3 rounded text-lg font-semibold text-center"
          onClick={handleStartMeeting}
        >
          Start New Meeting
        </button>
        {!showJoin && (
          <button
            className="bg-blue-600 text-white px-6 py-3 rounded text-lg font-semibold text-center"
            onClick={() => setShowJoin(true)}
          >
            Join Existing Meeting
          </button>
        )}
        {showJoin && (
          <form
            className="flex flex-col gap-2"
            onSubmit={e => {
              e.preventDefault();
              if (!meetingId.trim()) {
                setError("Please enter a meeting ID.");
                return;
              }
              window.location.href = `/meeting?meetingId=${meetingId.trim()}`;
            }}
          >
            <input
              type="text"
              placeholder="Enter Meeting ID"
              value={meetingId}
              onChange={e => { setMeetingId(e.target.value); setError(""); }}
              className="border border-gray-300 rounded px-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 placeholder-gray-400"
              autoFocus
            />
            {error && <span className="text-red-600 text-sm">{error}</span>}
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded text-lg font-semibold mt-1"
            >
              Join
            </button>
            <button
              type="button"
              className="text-gray-500 text-sm mt-1 underline"
              onClick={() => { setShowJoin(false); setMeetingId(""); setError(""); }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
