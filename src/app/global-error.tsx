"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body className="bg-[#0b0d10] p-6 text-slate-100">
        <main className="mx-auto mt-24 max-w-lg border border-slate-700 bg-[#151a21] p-6">
          <p className="text-sm font-medium text-[#d4ff3f]">Startup problem</p>
          <h1 className="mt-2 text-2xl font-semibold">Local Project OS could not start.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Verify write access to the local data directory and restart the application. No data was
            reset.
          </p>
        </main>
      </body>
    </html>
  );
}
