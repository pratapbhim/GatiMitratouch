"use client";
import React, { useMemo, useRef, useEffect, useState } from 'react';
import ParticipantCard from './ParticipantCard';

interface Participant {
  id: string;
  name: string;
  role: string;
  isScreenSharing?: boolean;
  email?: string;
  avatar?: string;
  isMuted?: boolean;
  deviceType?: 'desktop' | 'mobile';
  audioStream?: MediaStream | null;
  isSpeaking?: boolean;
}

interface ParticipantGridProps {
  participants: Participant[];
  sidebarOpen: boolean;
  screenSharingUserId?: string | null;
}

export default function ParticipantGrid({ participants, sidebarOpen, screenSharingUserId }: ParticipantGridProps) {
  // Find the screen sharing participant
  const screenSharingParticipant = participants.find(p => p.id === screenSharingUserId);
  const regularParticipants = participants.filter(p => p.id !== screenSharingUserId);

  // Layout config
  const cardsPerRow = sidebarOpen ? 6 : 7;
  const rowCount = Math.ceil(regularParticipants.length / cardsPerRow);
  const rows = useMemo(() => {
    const result: Participant[][] = [];
    for (let i = 0; i < rowCount; i++) {
      result.push(regularParticipants.slice(i * cardsPerRow, (i + 1) * cardsPerRow));
    }
    return result;
  }, [regularParticipants, cardsPerRow, rowCount]);

  // Scrolling logic
  const [scrollIndex, setScrollIndex] = useState(0); // 0: show latest 2 rows, 1: next, etc.
  useEffect(() => {
    if (rowCount > 2) {
      setScrollIndex(rowCount - 2);
    } else {
      setScrollIndex(0);
    }
  }, [rowCount]);

  // Smooth transition for row movement
  const gridRef = useRef<HTMLDivElement>(null);

  // Sticky header rows (older rows)
  const headerRows = rows.slice(0, Math.max(0, scrollIndex));
  // Visible rows (latest two)
  const visibleRows = rows.slice(scrollIndex, scrollIndex + 2);

  return (
    <div className="h-full flex flex-col">
      {/* Screen sharing display (if active) */}
      {screenSharingParticipant && (
        <div className="mb-4 bg-gray-900 rounded-lg overflow-hidden">
          <div className="relative">
            <div className="aspect-video bg-black">
              <video
                id={`screen-share-${screenSharingParticipant.id}`}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-white text-lg mb-2">
                    {screenSharingParticipant.name}'s screen
                  </div>
                  <div className="text-gray-400">
                    Screen sharing is active
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">Screen Sharing</span>
            </div>
          </div>
        </div>
      )}

      {/* Sticky header for older rows */}
      {headerRows.length > 0 && (
        <div className="sticky top-0 z-30 bg-white/80 flex flex-col gap-[15px] pb-2 transition-all duration-500">
          {headerRows.map((row, i) => (
            <div key={i} className="flex flex-row gap-[15px] justify-center">
              {row.map((participant) => (
                <ParticipantCard key={participant.id} participant={participant} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Main grid for visible rows */}
      <div ref={gridRef} className="flex flex-col gap-[15px] transition-all duration-500">
        {visibleRows.map((row, i) => (
          <div key={i} className="flex flex-row gap-[15px] justify-center">
            {row.map((participant) => (
              <ParticipantCard key={participant.id} participant={participant} />
            ))}
          </div>
        ))}
      </div>

      {/* Scroll controls if more than 2 rows */}
      {rowCount > 2 && (
        <div className="flex justify-center mt-2">
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium mx-2"
            disabled={scrollIndex === 0}
            onClick={() => setScrollIndex(scrollIndex - 1)}
          >
            ↑ Previous
          </button>
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium mx-2"
            disabled={scrollIndex >= rowCount - 2}
            onClick={() => setScrollIndex(scrollIndex + 1)}
          >
            ↓ Next
          </button>
        </div>
      )}
    </div>
  );
}