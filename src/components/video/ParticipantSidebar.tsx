import React, { useState } from 'react';
import { useMeetingStore } from '@/context/meetingContext';
import { useSession } from 'next-auth/react';

export default function ParticipantSidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (open: boolean) => void }) {
  const participants = useMeetingStore(s => s.participants);
  const [search, setSearch] = useState("");
  const { data: session } = useSession();
  // Host is the first participant (creator) by email
  const hostEmail = participants.length > 0 ? participants[0].email : undefined;
  const filtered = participants.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <aside className={`fixed right-0 top-0 h-full w-[300px] bg-white shadow-2xl rounded-l-3xl flex flex-col z-40 border-l border-gray-200 transition-all duration-300 ${isOpen ? '' : 'hidden'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <span className="text-gray-900 text-xl font-semibold">People</span>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full transition hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Search */}
      <div className="px-6 py-3 border-b border-gray-100">
        <input
          type="text"
          placeholder="Search for people"
          className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {/* Participant List */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
        <div className="text-xs text-gray-500 px-4 mb-2">IN THE MEETING</div>
        <div className="bg-gray-100 rounded-xl p-2">
          {filtered.length === 0 ? (
            <div className="text-gray-400 text-center py-6">No participants</div>
          ) : (
            filtered.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-200 transition">
                <img src={p.avatar || '/logo.png'} alt={p.name} className="w-9 h-9 rounded-full object-cover border-2 border-gray-200" />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-medium text-[15px] truncate whitespace-nowrap">{p.name}{session?.user?.email === p.email ? ' (You)' : ''}</div>
                  {p.email === hostEmail && (
                    <div className="text-gray-500 text-xs">Meeting host</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
