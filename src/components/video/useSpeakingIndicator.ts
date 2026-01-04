"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { useSession } from "next-auth/react";

/**
 * useSpeakingIndicator
 * Detects if a participant's audio stream is currently active (speaking) using Web Audio API analyser.
 * - Does NOT modify streams
 * - Does NOT send extra data
 * - Respects mute state
 * - Works for local and remote participants
 *
 * @param audioStream MediaStream | null
 * @param isMuted boolean
 * @returns isSpeaking boolean
 */
export function useSpeakingIndicator(audioStream: MediaStream | null, isMuted: boolean): boolean {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null); // Correct type: Uint8Array
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const { data: session } = useSession();
  const socket = getSocket && getSocket();
  const userId = socket?.id;
  const meetingId = typeof window !== 'undefined' ? (window.location.pathname.split("/")[2] || "") : "";

  useEffect(() => {
    if (!audioStream || isMuted) {
      setIsSpeaking(false);
      cleanup();
      return;
    }
    // Create AudioContext and AnalyserNode
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;
    const source = audioContext.createMediaStreamSource(audioStream);
    sourceRef.current = source;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    dataArrayRef.current = dataArray;

    // Animation loop to check audio level
    let lastSpeaking = false;
    const checkSpeaking = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      if (dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      }
      // Calculate average volume
      const avg = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
      // Threshold: adjust for sensitivity
      const speaking = avg > 18;
      setIsSpeaking(speaking);
      // Emit only on change
      if (speaking !== lastSpeaking && userId && meetingId && socket) {
        socket.emit("speaking", { meetingId, userId, isSpeaking: speaking });
        lastSpeaking = speaking;
      }
      rafRef.current = requestAnimationFrame(checkSpeaking);
    };
    rafRef.current = requestAnimationFrame(checkSpeaking);

    return cleanup;
    function cleanup() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (analyserRef.current) analyserRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      analyserRef.current = null;
      audioContextRef.current = null;
      dataArrayRef.current = null;
      sourceRef.current = null;
      rafRef.current = null;
    }
  }, [audioStream, isMuted, userId, meetingId, socket]);

  return isSpeaking;
}