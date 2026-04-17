"use client";

import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
  href?: string;
  onClose: (id: string) => void;
};

export default function ToastItem({
  id,
  title,
  message,
  type = "info",
  duration = 4000,
  href,
  onClose,
}: Toast) {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const Icon =
    type === "success" ? CheckCircle : type === "error" ? AlertCircle : Info;

  // Keep a single visual language for all toasts regardless of type.
  const styles = "border-primary/50 bg-surface text-foreground shadow-2xl shadow-black/25";
  const iconStyles = "text-primary";

  const handleBodyClick = () => {
    if (href) {
      onClose(id);
      router.push(href);
    }
  };

  return (
    <div
      className={`relative flex gap-3 rounded-xl border-2 px-4 py-3.5 shadow-xl animate-in slide-in-from-right ${styles} ${href ? "cursor-pointer" : ""}`}
      onClick={handleBodyClick}
    >
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconStyles}`} />

      <div className="flex-1 pr-6">
        {title && <p className="text-sm font-bold mb-0.5">{title}</p>}
        <p className="text-sm leading-relaxed">{message}</p>
        {href && <p className="text-xs opacity-60 mt-1">Click to view</p>}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onClose(id); }}
        className="absolute right-2 top-2 rounded-lg p-1.5 hover:bg-white/10 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
