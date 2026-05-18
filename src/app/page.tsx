import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("LandingPage");

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-5 py-12 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
          {t("brand")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          {t("description")}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/travel-assistant"
            className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            {t("cta")}
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("subtext")}
          </p>
        </div>
      </section>
    </main>
  );
}
