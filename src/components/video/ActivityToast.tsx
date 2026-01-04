import React, { useEffect } from "react";

interface Toast {
  id: string;
  message: string;
  type?: "info" | "success" | "error";
}

export const useActivityToasts = () => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  function showToast(message: string, type: Toast["type"] = "info") {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  return { toasts, showToast };
};

export default function ActivityToast({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-5 py-3 rounded-xl shadow-lg text-base font-medium bg-white border-l-4 transition-all duration-300
            ${toast.type === "success" ? "border-green-500 text-green-700" : ""}
            ${toast.type === "error" ? "border-red-500 text-red-700" : ""}
            ${toast.type === "info" ? "border-blue-500 text-blue-700" : ""}
          `}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
