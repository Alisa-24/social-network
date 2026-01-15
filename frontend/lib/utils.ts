type ToastType = "success" | "error" | "info";

function playToastSound(type: ToastType) {
  const src =
    type === "error"
      ? "/assets/sounds/notify2.mp3"
      : "/assets/sounds/notify.mp3";

  const audio = new Audio(src);
  audio.volume = 0.6;

  audio.play().catch(() => {
  });
}

export function toast(
  message: string,
  type: ToastType = "info",
  title?: string
) {
  if (!(globalThis as any).addToast) return;

  playToastSound(type);

  (globalThis as any).addToast({
    id: crypto.randomUUID(),
    message,
    type,
    title,
  });
}
