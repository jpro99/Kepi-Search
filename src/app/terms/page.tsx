import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold">Terms of Service</h1>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          This is a placeholder terms page for Kepi Travel Assistant. Final contractual terms and billing language can be
          inserted here before launch.
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          <p>Summary placeholder topics:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Service scope and acceptable use</li>
            <li>Plan billing and cancellation policy</li>
            <li>User responsibilities and account access</li>
            <li>Liability and dispute terms</li>
          </ul>
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
