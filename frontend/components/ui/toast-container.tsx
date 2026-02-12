"use client";

import { useState, useEffect } from "react";
import ToastItem, { Toast } from "./toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function removeToast(id: string) {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }

  useEffect(() => {
    // Only set up the global addToast function once
    if ((globalThis as any).addToast) {
      return; // Already initialized
    }

    (globalThis as any).addToast = (toast: Omit<Toast, "onClose">) => {
      setToasts((t) => {
        // Prevent duplicate toasts with the same message within 1 second
        const isDuplicate = t.some(
          (existing) =>
            existing.message === toast.message && existing.type === toast.type,
        );

        if (isDuplicate) {
          return t;
        }

        return [...t, { ...toast, onClose: removeToast }];
      });
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-100 space-y-3 w-90 max-w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}
