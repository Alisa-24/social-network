"use client";

import { useState } from "react";
import ToastItem, { Toast } from "./toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function removeToast(id: string) {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }

  (globalThis as any).addToast = (toast: Omit<Toast, "onClose">) => {
    setToasts((t) => [
      ...t,
      { ...toast, onClose: removeToast },
    ]);
  };

  return (
    <div className="fixed top-4 right-4 z-100 space-y-3 w-90 max-w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}
