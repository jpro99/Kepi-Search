"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const errorMessage = typeof error?.message === "string" && error.message.length > 0 ? error.message : "Unknown error";
  const errorStack = typeof error?.stack === "string" && error.stack.length > 0 ? error.stack : "Stack unavailable";
  const errorDigest = typeof error?.digest === "string" && error.digest.length > 0 ? error.digest : null;

  const hardResetAndReload = async (): Promise<void> => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch {
      // Continue recovery even if service worker cleanup fails.
    }

    try {
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
      }
    } catch {
      // Continue recovery even if cache cleanup fails.
    }

    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // Storage may be unavailable in private modes.
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("hard-reset", Date.now().toString());
    window.location.assign(nextUrl.toString());
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 py-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-slate-600">
        We&apos;ve recorded this error and are looking into it. Please try again.
      </p>
      <section className="w-full rounded-lg border border-red-200 bg-red-50 p-4 text-left text-xs text-red-900">
        <p className="font-semibold">Error message</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">{errorMessage}</pre>
        {errorDigest ? (
          <>
            <p className="mt-3 font-semibold">Error digest</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">{errorDigest}</pre>
          </>
        ) : null}
        <p className="mt-3 font-semibold">Error stack</p>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words">{errorStack}</pre>
      </section>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => void hardResetAndReload()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
        >
          Clear app cache & reload
        </button>
      </div>
    </main>
  );
}
