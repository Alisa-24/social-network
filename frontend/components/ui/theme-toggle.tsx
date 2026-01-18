"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Run once on mount
  useEffect(() => {
    setMounted(true);

    const storedTheme = localStorage.getItem("theme");
    let dark: boolean;

    if (storedTheme === "dark") {
      dark = true;
    } else if (storedTheme === "light") {
      dark = false;
    } else {
      // No preference set, use system preference
      dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    console.log("Current isDark state:", isDark);
    const next = !isDark;
    console.log("Next isDark state:", next);
    setIsDark(next);

    const newTheme = next ? "dark" : "light";
    console.log("Setting theme to:", newTheme);

    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", newTheme);

    console.log("Saved theme:", localStorage.getItem("theme"));
    console.log("HTML classes:", document.documentElement.className);
  }

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-border transition"
    >
      {isDark ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
