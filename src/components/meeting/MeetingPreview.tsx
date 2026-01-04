"use client";
import React, { useState, useRef, useEffect } from "react";
import { useMeetingStore } from "@/context/meetingContext";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { useSearchParams } from "next/navigation";


export default function MeetingPreview({
  user = { name: "Bhim Pratap Singh", avatar: "", email: "bhimpratap321456@gmail.com" },
  onJoin = () => {},
}) {
  // For preview: fetch participants if meetingId is present in URL
  const searchParams = useSearchParams();
  const meetingId = searchParams.get('meetingId') || "";
  const [previewParticipants, setPreviewParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (!meetingId || meetingId === "preview") return;
    // Connect to socket server (use your actual server URL)
    const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const socket = connectSocket(serverUrl);
    // Join as preview (not a real participant)
    socket.emit("join-room", { meetingId, user: { name: "Preview", email: "preview@preview.com" }, preview: true });
    // Listen for participants
    const handleRoomParticipants = (participants: any[]) => {
      setPreviewParticipants(participants);
    };
    socket.on("room-participants", handleRoomParticipants);
    // Request participants list (in case not sent automatically)
    socket.emit("get-participants", { meetingId });
    // Clean up: disconnect socket on unmount
    return () => {
      socket.off("room-participants", handleRoomParticipants);
      disconnectSocket();
    };
  }, [meetingId]);
  // Default: camera and mic OFF
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const [devices, setDevices] = useState<{
    mic: DeviceInfo[];
    speaker: DeviceInfo[];
    camera: DeviceInfo[];
  }>({
    mic: [],
    speaker: [],
    camera: []
  });
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [showAccountSwitch, setShowAccountSwitch] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const otherOptionsRef = useRef<HTMLDivElement>(null);

  // DeviceInfo type for device state
  type DeviceInfo = {
    deviceId: string;
    label: string;
  };

  // Use image from session as avatar fallback
  const userAvatar = user.avatar || "";

  // Device enumeration
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.enumerateDevices === "function"
    ) {
      navigator.mediaDevices.enumerateDevices().then((all) => {
        setDevices({
          mic: all.filter((d) => d.kind === "audioinput").map((d) => ({ deviceId: d.deviceId, label: d.label })),
          speaker: all.filter((d) => d.kind === "audiooutput").map((d) => ({ deviceId: d.deviceId, label: d.label })),
          camera: all.filter((d) => d.kind === "videoinput").map((d) => ({ deviceId: d.deviceId, label: d.label })),
        });
        setSelectedMic(all.find((d) => d.kind === "audioinput")?.deviceId || "");
        setSelectedSpeaker(all.find((d) => d.kind === "audiooutput")?.deviceId || "");
        setSelectedCamera(all.find((d) => d.kind === "videoinput")?.deviceId || "");
      });
    } else {
      // Optionally, show a warning or fallback UI
      setDevices({ mic: [], speaker: [], camera: [] });
      setSelectedMic("");
      setSelectedSpeaker("");
      setSelectedCamera("");
    }
  }, []);

  // Check permissions initially
  useEffect(() => {
    navigator.permissions.query({ name: 'microphone' as any }).then(permissionStatus => {
      setMicBlocked(permissionStatus.state === 'denied');
    });

    navigator.permissions.query({ name: 'camera' as any }).then(permissionStatus => {
      setCameraBlocked(permissionStatus.state === 'denied');
    });
  }, []);

  // Camera preview logic
  useEffect(() => {
    if (cameraOn && selectedCamera && !cameraBlocked) {
      navigator.mediaDevices
        .getUserMedia({ video: { deviceId: { exact: selectedCamera } }, audio: false })
        .then((stream) => {
          setCameraBlocked(false);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch((error) => {
          console.error("Camera error:", error);
          setCameraBlocked(true);
        });
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraOn, selectedCamera, cameraBlocked]);

  // Handle camera toggle with permission check
  const handleCameraToggle = async () => {
    if (!cameraOn && cameraBlocked) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately after getting permission
        setCameraBlocked(false);
        setCameraOn(true);
      } catch (error) {
        console.error("Camera permission denied:", error);
        setCameraBlocked(true);
        alert("Please allow camera access in your browser settings.");
      }
    } else {
      setCameraOn(!cameraOn);
    }
  };

  // Handle mic toggle with permission check
  const handleMicToggle = async () => {
    if (!micOn && micBlocked) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately after getting permission
        setMicBlocked(false);
        setMicOn(true);
      } catch (error) {
        console.error("Microphone permission denied:", error);
        setMicBlocked(true);
        alert("Please allow microphone access in your browser settings.");
      }
    } else {
      setMicOn(!micOn);
    }
  };

  // Close other options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (otherOptionsRef.current && !otherOptionsRef.current.contains(event.target as Node)) {
        setShowOtherOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Place this useEffect at the top-level of the component, not inside JSX
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const dropdown = document.querySelector('.account-switch-dropdown');
      if (showAccountSwitch && dropdown && !dropdown.contains(event.target as Node)) {
        setShowAccountSwitch(false);
      }
    };
    if (showAccountSwitch) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAccountSwitch]);

  // Get participants from meeting store
  const participants = useMeetingStore((state) => state.participants);
  // Check if current user is already in the meeting
  const alreadyInMeeting = participants.some((p) => p.email === user.email);

  // UI
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Compact Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-green-400 rounded flex items-center justify-center">
            <span className="text-white font-bold">G</span>
          </div>
          <span className="text-lg font-bold text-gray-800">Gatimitra Touch</span>
          <span className="text-sm text-gray-500 hidden md:inline">• Secure Video Meeting</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-gray-600">{user.name[0]}</span>
            )}
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-medium text-gray-800">{user.name}</span>
            <div className="relative">
              <button
                className="text-xs text-teal-600 hover:underline"
                onClick={() => setShowAccountSwitch((v) => !v)}
              >
                Switch account
              </button>
              {showAccountSwitch && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 text-sm account-switch-dropdown">
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800"
                    onClick={() => {
                      setShowAccountSwitch(false);
                      // sign out logic here
                      if (typeof window !== 'undefined') {
                        window.location.href = '/api/auth/signout';
                      }
                    }}
                  >
                    Sign out
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 border-t border-gray-100"
                    onClick={() => {
                      setShowAccountSwitch(false);
                      // sign in logic here
                      if (typeof window !== 'undefined') {
                        window.location.href = '/api/auth/signin';
                      }
                    }}
                  >
                    Sign in with another account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Compact Layout */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 md:py-8">
        {/* Preview and Join Panel in Single Row */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-4xl w-full">
          
          {/* Left: Preview Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 w-full md:w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Your preview</h3>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-400 to-green-400 flex items-center justify-center overflow-hidden">
                  {userAvatar ? (
                    <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-sm">{user.name[0]}</span>
                  )}
                </div>
                <span className="text-sm text-gray-600 hidden sm:inline">{user.name}</span>
              </div>
            </div>

            {/* Camera Preview */}
            <div className="w-full h-48 rounded-xl bg-gray-100 overflow-hidden mb-4 relative">
              {cameraOn && !cameraBlocked ? (
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center mb-3 overflow-hidden">
                    {userAvatar ? (
                      <img src={userAvatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-2xl font-bold text-gray-600">{user.name[0]}</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 text-center px-4">
                    Camera is off
                  </span>
                </div>
              )}
            </div>

            {/* Quick Controls */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${micOn ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-600 border border-gray-200"} ${micBlocked ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
                onClick={handleMicToggle}
                disabled={micBlocked && !micOn}
              >
                {micOn ? (
                  <>
                    {/* New Mic On Icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span className="text-sm">Mic on</span>
                  </>
                ) : (
                  <>
                    {/* New Mic Off Icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 1l22 22" strokeLinecap="round" />
                      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span className="text-sm">Mic off</span>
                  </>
                )}
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${cameraOn ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-600 border border-gray-200"} ${cameraBlocked ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
                onClick={handleCameraToggle}
                disabled={cameraBlocked && !cameraOn}
              >
                {cameraOn ? (
                  <>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17 10.5V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-3.5l4 4v-11l-4 4z"></path>
                    </svg>
                    <span className="text-sm">Camera on</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17 10.5V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-3.5l4 4v-11l-4 4zM3 3l18 18"></path>
                    </svg>
                    <span className="text-sm">Camera off</span>
                  </>
                )}
              </button>
            </div>

            {/* Camera Status */}
            <div className={`text-xs text-center ${cameraBlocked ? "text-red-600" : "text-gray-500"}`}>
              {cameraBlocked ? "Camera access is blocked" : "Camera ready to use"}
            </div>
          </div>

          {/* Right: Join Panel */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 w-full md:w-96 relative">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Ready to join?</h2>
              {/* Show up to 4 participant avatars and names for preview if meetingId is present */}
              {meetingId && meetingId !== "preview" && previewParticipants.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    {previewParticipants.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex flex-col items-center">
                        <img src={p.avatar || '/default-avatar.png'} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                      </div>
                    ))}
                    {previewParticipants.length > 3 && (
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700 border border-gray-200">
                          +{previewParticipants.length - 3}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-center text-gray-700 text-sm mb-2">
                    {previewParticipants.slice(0, 3).map(p => p.name).join(", ")}
                    {previewParticipants.length > 3 && ` and ${previewParticipants.length - 3} more are in this call`}
                    {previewParticipants.length <= 3 && previewParticipants.length > 0 && ` ${previewParticipants.length === 1 ? 'is' : 'are'} in this call`}
                  </div>
                </>
              )}
              {alreadyInMeeting ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <img src={user.avatar || '/default-avatar.png'} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                    <span className="text-gray-800 font-medium">{user.name} is in this call</span>
                  </div>
                  <button className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition mb-2">Switch here</button>
                  <button className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-400 to-green-400 text-white font-semibold hover:opacity-90 transition-opacity">Join here too</button>
                </>
              ) : (
                <>
                  <p className="text-gray-600 text-sm mb-2">You'll join as <span className="font-semibold">{user.name}</span></p>
                  <button className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-400 to-green-400 text-white font-semibold hover:opacity-90 transition-opacity mb-2" onClick={onJoin}>Join meeting now</button>
                  <button className="w-full py-3 rounded-xl bg-gray-50 text-gray-700 font-semibold border border-gray-200 hover:bg-gray-100 transition-colors">Join without camera</button>
                </>
              )}
            </div>

            {/* Other Options */}
            <div className="border-t border-gray-100 pt-4" ref={otherOptionsRef}>
              <button
                onClick={() => setShowOtherOptions(!showOtherOptions)}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium cursor-pointer flex items-center justify-between w-full"
              >
                <span>Other joining options</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showOtherOptions ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showOtherOptions && (
                <div className="mt-3 space-y-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 shadow-lg absolute left-6 right-6 z-10">
                  <div className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                    <span className="font-medium">Companion mode</span>
                    <span className="text-xs text-gray-400 ml-auto">(For chat or second device)</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                    <span className="font-medium">Present only</span>
                    <span className="text-xs text-gray-400 ml-auto">(Share your screen)</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                    <span className="font-medium">Phone for audio</span>
                    <span className="text-xs text-gray-400 ml-auto">(Dial in separately)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio & Video Settings Panel - Fixed Color Scheme */}
        <div className="mt-4 md:mt-8 max-w-4xl w-full">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <path d="M12 8v8"></path>
                <path d="M8 12h8"></path>
              </svg>
              Audio & video settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Microphone */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* New Mic Icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Microphone</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${micBlocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                    {micBlocked ? "Blocked" : "Allowed"}
                  </span>
                </div>
                <select
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-gray-800 disabled:text-gray-400"
                  value={selectedMic}
                  onChange={e => setSelectedMic(e.target.value)}
                  disabled={micBlocked}
                >
                  {devices.mic.map((d) => (
                    <option key={d.deviceId} value={d.deviceId} className="text-gray-800">
                      {d.label || "Default microphone"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speaker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 17h16M4 7h16"></path>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Speaker</span>
                  </div>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                    Blocked
                  </span>
                </div>
                <select
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-gray-800 disabled:text-gray-400"
                  value={selectedSpeaker}
                  onChange={e => setSelectedSpeaker(e.target.value)}
                  disabled={true}
                >
                  {devices.speaker.map((d) => (
                    <option key={d.deviceId} value={d.deviceId} className="text-gray-800">
                      {d.label || "Default speaker"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17 10.5V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-3.5l4 4v-11l-4 4z"></path>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Camera</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${cameraBlocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                    {cameraBlocked ? "Blocked" : "Allowed"}
                  </span>
                </div>
                <select
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-gray-800 disabled:text-gray-400"
                  value={selectedCamera}
                  onChange={e => setSelectedCamera(e.target.value)}
                  disabled={cameraBlocked}
                >
                  {devices.camera.map((d) => (
                    <option key={d.deviceId} value={d.deviceId} className="text-gray-800">
                      {d.label || "Default camera"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}