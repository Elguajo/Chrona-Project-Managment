"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("Local Project OS could not load.", error);
  }, [error]);

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="w-full max-w-lg border border-[var(--border)] bg-[var(--muted)] p-6">
        <p className="text-sm font-medium text-[var(--accent)]">Startup problem</p>
        <h1 className="mt-2 text-2xl font-semibold">Local data could not be initialized.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
          Check that the application can write to its <code>data</code> directory, then retry.
          Existing data has not been reset or replaced.
        </p>
        <button
          className="mt-6 bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)]"
          onClick={reset}
          type="button"
        >
          Retry initialization
        </button>
      </section>
    </main>
  );
}
