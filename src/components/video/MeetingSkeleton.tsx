import React from "react";

export default function MeetingSkeleton() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-[#f7f9fb] via-[#eaf3f7] to-[#e0f7ef] animate-pulse">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-40 flex items-center bg-white shadow-sm w-full px-8" style={{ minHeight: 72 }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full" />
          <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="h-8 w-24 bg-gray-200 rounded-xl" />
        </div>
      </div>
      {/* Main Content Skeleton */}
      <div className="flex flex-1 w-full max-w-[1600px] mx-auto pt-4 pb-24 px-8 gap-6">
        {/* Grid Skeleton */}
        <div className="flex-1 min-w-0 grid grid-cols-5 grid-rows-2 gap-7">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-white/90 shadow-xl h-56 flex flex-col justify-end">
              <div className="flex-1 bg-gray-200 rounded-t-3xl" />
              <div className="px-6 py-4 flex items-center rounded-b-3xl border-t border-gray-100 min-h-[60px] bg-white">
                <div className="w-3 h-3 rounded-full bg-gray-300 mr-2" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="ml-2 h-4 w-12 bg-gray-100 rounded" />
                <div className="flex-1" />
                <div className="w-8 h-2 bg-gray-200 rounded-full ml-2" />
              </div>
            </div>
          ))}
        </div>
        {/* Sidebar Skeleton */}
        <div className="shrink-0 w-[370px] flex flex-col rounded-l-3xl bg-gradient-to-b from-white via-[#f7f9fb] to-[#f2f6f8] shadow-2xl border-l border-gray-100">
          <div className="px-7 py-6 border-b border-gray-100">
            <div className="h-8 w-40 bg-gray-200 rounded-lg" />
          </div>
          <div className="px-7 py-3 border-b border-gray-100">
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
          <div className="flex-1 px-2 py-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/90 shadow-sm">
                <div className="w-11 h-11 rounded-full bg-gray-200" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="px-7 py-5 border-t border-gray-100">
            <div className="h-10 w-full bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
      {/* Controls Skeleton */}
      <div className="fixed left-16 z-20 flex items-end" style={{ bottom: 5 }}>
        <div className="flex gap-3 bg-white/90 rounded-full shadow-lg px-4 py-2 items-center border border-gray-200">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-9 h-9 rounded-full bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
