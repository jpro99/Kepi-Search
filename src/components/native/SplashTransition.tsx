"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { isNative } from "@/lib/native/capacitorBridge";

interface SplashTransitionProps {
  children: ReactNode;
}

export function SplashTransition({ children }: SplashTransitionProps) {
  const nativeContext = useMemo(() => isNative(), []);
  const [visible, setVisible] = useState(nativeContext);

  useEffect(() => {
    if (!nativeContext) return;
    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [nativeContext]);

  return (
    <>
      {visible ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950 text-slate-100">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Kepi</p>
            <p className="mt-2 text-xl font-semibold">Travel Assistant</p>
            <p className="mt-2 text-xs text-slate-400">Preparing your trip dashboard...</p>
          </div>
        </div>
      ) : null}
      <div className={visible ? "opacity-0" : "opacity-100 transition-opacity duration-300"}>{children}</div>
    </>
  );
}
