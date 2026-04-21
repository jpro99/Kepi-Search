"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { IntegrationsMasked, IntegrationsVaultV1 } from "@/lib/settings/types";

type LoadState =
  | { status: "loading" }
  | { status: "need-login" }
  | { status: "misconfigured"; message: string }
  | { status: "ready"; masked: IntegrationsMasked };

const fieldList: {
  key: keyof IntegrationsVaultV1;
  label: string;
  hint: string;
  secret: boolean;
}[] = [
  {
    key: "seatsAeroApiKey",
    label: "Seats.aero API key",
    hint: "Pro: Settings → API on seats.aero. Sent only as Partner-Authorization to Seats; never logged.",
    secret: true,
  },
  {
    key: "alaskaMileagePlan",
    label: "Alaska Mileage Plan number",
    hint: "Optional — for your own notes and future trip planner wiring.",
    secret: false,
  },
  {
    key: "americanAAdvantage",
    label: "American AAdvantage number",
    hint: "Optional.",
    secret: false,
  },
  {
    key: "unitedMileagePlus",
    label: "United MileagePlus number",
    hint: "Optional.",
    secret: false,
  },
  {
    key: "deltaSkyMiles",
    label: "Delta SkyMiles number",
    hint: "Optional.",
    secret: false,
  },
  {
    key: "marriottBonvoy",
    label: "Marriott Bonvoy number",
    hint: "Optional.",
    secret: false,
  },
  {
    key: "hiltonHonors",
    label: "Hilton Honors number",
    hint: "Optional.",
    secret: false,
  },
  {
    key: "worldOfHyatt",
    label: "World of Hyatt number",
    hint: "Optional.",
    secret: false,
  },
  {
    key: "notes",
    label: "Private notes",
    hint: "Optional reminders (avoid storing real passwords here).",
    secret: false,
  },
];

export default function IntegrationsClient() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<IntegrationsVaultV1>>({});
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [seatsTest, setSeatsTest] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoad({ status: "loading" });
    const r = await fetch("/api/settings/integrations", { cache: "no-store" });
    if (r.status === 401) {
      setLoad({ status: "need-login" });
      return;
    }
    if (r.status === 503) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setLoad({
        status: "misconfigured",
        message: j.error ?? "Server misconfigured.",
      });
      return;
    }
    if (!r.ok) {
      setLoad({
        status: "misconfigured",
        message: `Could not load settings (${r.status}).`,
      });
      return;
    }
    const j = (await r.json()) as { masked: IntegrationsMasked };
    setLoad({ status: "ready", masked: j.masked });
    setForm({});
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const r = await fetch("/api/settings/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword }),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setLoginError(j.error ?? "Login failed");
      return;
    }
    setLoginPassword("");
    await refresh();
  };

  const onLogout = async () => {
    await fetch("/api/settings/auth", { method: "DELETE" });
    setLoad({ status: "need-login" });
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveHint(null);
    const r = await fetch("/api/settings/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setSaveHint(j.error ?? "Save failed");
      return;
    }
    setSaveHint("Saved.");
    setForm({});
    await refresh();
    window.setTimeout(() => setSaveHint(null), 3000);
  };

  const onSeatsTest = async () => {
    setSeatsTest(null);
    const r = await fetch("/api/settings/integrations/seats-test", {
      method: "POST",
    });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    setSeatsTest(JSON.stringify(j, null, 2));
  };

  if (load.status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (load.status === "misconfigured") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-500/40 bg-amber-950/40 p-6 text-amber-100">
        <p className="font-semibold">Settings are not available yet</p>
        <p className="mt-2 text-sm text-amber-200/90">{load.message}</p>
        <p className="mt-4 text-xs text-amber-200/70">
          Add variables to <code className="text-cyan-200">.env.local</code> next
          to <code className="text-cyan-200">package.json</code>, then restart{" "}
          <code className="text-cyan-200">npm run dev</code>.
        </p>
      </div>
    );
  }

  if (load.status === "need-login") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900/90 p-8 shadow-xl">
        <h1 className="text-lg font-bold text-cyan-300">Integrations</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the settings password from your server configuration.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onLogin}>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </label>
          {loginError && (
            <p className="text-sm text-amber-300">{loginError}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-500 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  const { masked } = load;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-cyan-500/90">
            Kepi Search
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">
            Integrations &amp; loyalty
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Store API keys and member numbers in an{" "}
            <strong className="text-slate-300">encrypted httpOnly cookie</strong>{" "}
            on your own browser session. Do{" "}
            <strong className="text-slate-300">not</strong> put Marriott, Hilton,
            or airline <em>website passwords</em> here — only keys and loyalty IDs
            you are comfortable keeping on this host.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Back to map
          </Link>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Lock &amp; clear session cookies
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Seats.aero
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Pro API keys are scoped to your Seats.aero account and daily quota.
          Use <span className="text-cyan-200">Test connection</span> to run a
          small cached search (LAX → FCO, take 10) and confirm the key works.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void onSeatsTest()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-700/50 hover:bg-slate-700"
          >
            Test connection
          </button>
          {masked.seatsAeroApiKey && (
            <span className="self-center text-xs text-slate-500">
              Key on file:{" "}
              <code className="text-slate-300">
                {masked.preview.seatsAeroApiKey}
              </code>
            </span>
          )}
        </div>
        {seatsTest && (
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-300 ring-1 ring-slate-800">
            {seatsTest}
          </pre>
        )}
      </section>

      <form
        onSubmit={onSave}
        className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Credentials
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {fieldList.map(({ key, label, hint, secret }) => (
            <label key={String(key)} className="block text-sm">
              <span className="font-medium text-slate-200">{label}</span>
              <span className="mt-1 block text-xs text-slate-500">{hint}</span>
              {Boolean(
                (masked as unknown as Record<string, boolean>)[String(key)] ===
                  true,
              ) ? (
                <p className="mt-1 text-xs text-slate-500">
                  On file:{" "}
                  <code className="text-slate-300">
                    {(masked.preview as Record<string, string | undefined>)[
                      String(key)
                    ] ?? "set"}
                  </code>{" "}
                  — leave blank to keep, or save with only a space in the field
                  to remove.
                </p>
              ) : null}
              <input
                type={secret ? "password" : "text"}
                autoComplete="off"
                name={String(key)}
                placeholder={
                  secret ? "Paste key — stored encrypted" : "Optional"
                }
                value={(form[key] as string | undefined) ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          To remove a value: type a single space in that field and save (empty
          string clears). Leaving a field blank leaves the previous value
          unchanged.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-cyan-500 px-6 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
          >
            Save securely
          </button>
          {saveHint && (
            <span className="text-sm text-cyan-200/90">{saveHint}</span>
          )}
        </div>
      </form>
    </div>
  );
}
