import { create } from 'zustand';

interface Participant {
  id: string;
  name: string;
  org?: string;
  isMuted: boolean;
  isSpeaking?: boolean;
  avatar?: string;
  email?: string;
  deviceType?: 'desktop' | 'mobile';
  accessRequested?: boolean;
  admitted?: boolean;
}

interface ChatMessage {
  from: string;
  user: string;
  message: string;
  avatar?: string;
  email?: string;
  time?: string;
}

interface MeetingState {
  participants: Participant[];
  chat: ChatMessage[];
  pinnedMessage: ChatMessage | null;
  addParticipant: (p: Participant) => void;
  removeParticipant: (id: string) => void;
  muteParticipant: (id: string) => void;
  kickParticipant: (id: string) => void;
  requestAccess: (p: Participant) => void;
  admitParticipant: (id: string) => void;
  addChat: (msg: ChatMessage) => void;
  setParticipants: (ps: Participant[]) => void;
  setPinnedMessage: (msg: ChatMessage | null) => void;
  clearMeetingState: () => void;
  setParticipantSpeaking: (id: string, isSpeaking: boolean) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  participants: [],
  chat: [],
  pinnedMessage: null,
  addParticipant: (p) => set((state) => ({
    participants: state.participants.some(part => part.id === p.id)
      ? state.participants.map(part => part.id === p.id ? { ...part, ...p } : part)
      : [...state.participants, p]
  })),
  removeParticipant: (id) => set((state) => ({
    participants: state.participants.filter(p => p.id !== id)
  })),
  muteParticipant: (id) => set((state) => ({
    participants: state.participants.map(p =>
      p.id === id ? { ...p, isMuted: true } : p
    )
  })),
  kickParticipant: (id) => set((state) => ({
    participants: state.participants.filter(p => p.id !== id)
  })),
  requestAccess: (p) => set((state) => ({
    participants: [...state.participants, { ...p, accessRequested: true }]
  })),
  admitParticipant: (id) => set((state) => ({
    participants: state.participants.map(p =>
      p.id === id ? { ...p, admitted: true, accessRequested: false } : p
    )
  })),
  addChat: (msg) => set((state) => ({
    chat: state.chat.some(
      (m) => m.user === msg.user && m.message === msg.message && m.time === msg.time
    )
      ? state.chat
      : [...state.chat, msg]
  })),
  setParticipants: (ps) => set(() => ({
    participants: ps
  })),
  setPinnedMessage: (msg) => set(() => ({ pinnedMessage: msg })),
  clearMeetingState: () => set(() => ({
    participants: [],
    chat: [],
    pinnedMessage: null,
  })),
  setParticipantSpeaking: (id, isSpeaking) => set((state) => ({
    participants: state.participants.map(p =>
      p.id === id ? { ...p, isSpeaking } : p
    )
  })),
}));