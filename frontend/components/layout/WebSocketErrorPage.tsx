"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";

interface WebSocketErrorPageProps {
  onRetry: () => void;
  isReconnecting?: boolean;
  reconnectAttempts?: number;
  maxAttempts?: number;
}

export default function WebSocketErrorPage({
  onRetry,
  isReconnecting = false,
  reconnectAttempts = 0,
  maxAttempts = 5,
}: WebSocketErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        {/* Error Card */}
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <WifiOff className="w-10 h-10 text-red-500" />
              </div>
              {isReconnecting && (
                <div className="absolute -bottom-1 -right-1">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-pulse">
                    <RefreshCw className="w-4 h-4 text-black animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Connection Lost
          </h1>

          {/* Description */}
          <p className="text-foreground/60 text-sm mb-6">
            {isReconnecting ? (
              <>
                Attempting to reconnect to the server...
                <br />
                <span className="text-xs">
                  Attempt {reconnectAttempts} of {maxAttempts}
                </span>
              </>
            ) : (
              <>
                Your connection to the server has been lost. Please check your
                internet connection and try again.
              </>
            )}
          </p>

          {/* Retry Button */}
          <button
            onClick={onRetry}
            disabled={isReconnecting}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-black px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isReconnecting ? "animate-spin" : ""}`}
            />
            {isReconnecting ? "Reconnecting..." : "Reload Page"}
          </button>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-foreground/40">
              If the problem persists, please contact support
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-foreground/40">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Disconnected from server</span>
        </div>
      </div>
    </div>
  );
}