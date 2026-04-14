"use client";

import { RefreshCw } from "lucide-react";

export function RecoveryUI({ message }: { message?: string }) {
  return (
    <div className="mesh-gradient flex min-h-screen flex-col items-center justify-center p-6 text-center text-white">
      <div className="glass-panel max-w-md space-y-6 p-10 backdrop-blur-3xl shadow-2xl rounded-[32px] border border-white/10">
        <div className="flex justify-center">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-white/10" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-xl backdrop-blur-md">
              <RefreshCw className="h-8 w-8 animate-spin text-white" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Syncing your session</h1>
          {message && (
            <div className="rounded-xl bg-black/20 p-4 font-mono text-xs text-white/60 border border-white/10 text-left overflow-auto max-h-32">
              {message}
            </div>
          )}
          <p className="text-lg text-white/70">
            We're putting the finishing touches on your private workspace. This usually takes just a few seconds.
          </p>
        </div>
        <div className="pt-6">
          <button
            onClick={() => window.location.reload()}
            className="w-full h-14 rounded-2xl bg-white text-base font-bold text-[var(--color-accent)] shadow-xl transition-all hover:scale-105 hover:shadow-2xl active:scale-95"
          >
            Refresh workspace
          </button>
        </div>
        <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">
          Secure multi-tenant environment
        </p>
      </div>
    </div>
  );
}
