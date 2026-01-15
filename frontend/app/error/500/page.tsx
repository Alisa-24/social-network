"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ServerErrorPage() {
  const router = useRouter();

  const handleRetry = () => {
    router.back();
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-4">500</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Server Error
          </h2>
          <p className="text-foreground/60 mb-8">
            The server is currently not working. Please try again later.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="block w-full px-6 py-3 border border-border text-foreground rounded-md font-medium hover:bg-foreground/5 transition-all duration-200"
          >
            Go Home
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-foreground/40">
            If the problem persists, please contact support
          </p>
        </div>
      </div>
    </div>
  );
}
