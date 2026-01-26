"use client";

import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
};

export default function ToastItem({
  id,
  title,
  message,
  type = "info",
  duration = 4000,
  onClose,
}: Toast) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const Icon =
    type === "success" ? CheckCircle : type === "error" ? AlertCircle : Info;

  const styles =
    type === "success"
      ? "border-green-500/40 bg-green-950/50 text-green-400"
      : type === "error"
        ? "border-red-500/40 bg-red-950/50 text-red-400"
        : "border-primary/40 bg-primary/10 text-primary";

  return (
    <div
      className={`relative flex gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur animate-in slide-in-from-right ${styles}`}
    >
      <Icon className="h-5 w-5 mt-0.5" />

      <div className="flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <p className="text-sm opacity-90">{message}</p>
      </div>

      <button
        onClick={() => onClose(id)}
        className="absolute right-2 top-2 rounded-md p-1 hover:bg-black/20"
      >
        <X className="h-4 w-4 opacity-70" />
      </button>
    </div>
  );
}
