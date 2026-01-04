"use client";
import Image from "next/image";
import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Logo and app name top left */}
      <div className="flex items-center gap-4 mt-10 ml-10">
        {/* Hydration-safe logo fallback, size matches text height */}
        {(() => {
          const [imgError, setImgError] = require('react').useState(false);
          return imgError ? (
            <svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="35" cy="35" r="35" fill="#F37021"/>
              <path d="M25 35C25 29.4772 29.4772 25 35 25C40.5228 25 45 29.4772 45 35C45 40.5228 40.5228 45 35 45C29.4772 45 25 40.5228 25 35Z" fill="#fff"/>
              <path d="M32 35C32 33.3431 33.3431 32 35 32C36.6569 32 38 33.3431 38 35C38 36.6569 36.6569 38 35 38C33.3431 38 32 36.6569 32 35Z" fill="#43A047"/>
              <rect x="33" y="41" width="4" height="8" rx="2" fill="#43A047"/>
            </svg>
          ) : (
            <img
              src="/logo.png"
              alt="Gatimitra Touch Logo"
              width={70}
              height={70}
              onError={() => setImgError(true)}
              style={{ display: 'block' }}
            />
          );
        })()}
        <span className="text-[3.2rem] font-extrabold tracking-tight" style={{ color: '#F37021', lineHeight: 1 }}>
          Gatimitra <span style={{ color: '#219653' }}>Touch</span>
        </span>
      </div>
      {/* Centered sign-in button */}
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl px-12 py-8 flex flex-col items-center" style={{ minWidth: 500 }}>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="flex items-center gap-4 px-24 py-4 bg-white rounded-lg shadow border border-gray-200 hover:shadow-lg transition text-2xl font-semibold text-gray-900"
            style={{ minWidth: 480, height: 64 }}
          >
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_17_40)">
                <path d="M47.5 24.5C47.5 22.8333 47.3333 21.3333 47.0833 19.8333H24V28.5H37.3333C36.8333 31.1667 35.1667 33.5 32.8333 35.0833V40.0833H40.1667C44.1667 36.5 47.5 31.1667 47.5 24.5Z" fill="#4285F4"/>
                <path d="M24 48C30.5 48 35.8333 45.8333 40.1667 40.0833L32.8333 35.0833C30.8333 36.3333 28.5 37.1667 24 37.1667C17.8333 37.1667 12.5 33.0833 10.6667 27.6667H2.16666V32.8333C6.5 41.1667 14.6667 48 24 48Z" fill="#34A853"/>
                <path d="M10.6667 27.6667C10.1667 26.3333 9.83333 24.8333 9.83333 23.3333C9.83333 21.8333 10.1667 20.3333 10.6667 19V13.8333H2.16666C0.833328 16.3333 0 19.5 0 23.3333C0 27.1667 0.833328 30.3333 2.16666 32.8333L10.6667 27.6667Z" fill="#FBBC05"/>
                <path d="M24 9.83333C28.1667 9.83333 31.1667 11.5 32.8333 13.0833L40.3333 6.16666C35.8333 2.16666 30.5 0 24 0C14.6667 0 6.5 6.83333 2.16666 15.1667L10.6667 20.3333C12.5 15.9167 17.8333 9.83333 24 9.83333Z" fill="#EA4335"/>
              </g>
              <defs>
                <clipPath id="clip0_17_40">
                  <rect width="48" height="48" fill="white"/>
                </clipPath>
              </defs>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
