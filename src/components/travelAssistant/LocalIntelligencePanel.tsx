"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface LocalTips {
  bestAreasToStay: string[];
  localTransportTips: string[];
  currencyAndTippingCustoms: string[];
  safetyNotes: string[];
  packingSuggestions: string[];
}

interface LocalIntelligencePanelProps {
  destination: string;
  startDate?: string;
  endDate?: string;
}

const SECTION_CONFIG: Array<{ key: keyof LocalTips; title: string }> = [
  { key: "bestAreasToStay", title: "Best areas to stay near arrival hubs" },
  { key: "localTransportTips", title: "Local transport tips" },
  { key: "currencyAndTippingCustoms", title: "Currency and tipping customs" },
  { key: "safetyNotes", title: "Safety notes" },
  { key: "packingSuggestions", title: "Packing suggestions" },
];

export function LocalIntelligencePanel({ destination, startDate, endDate }: LocalIntelligencePanelProps) {
  const [localTips, setLocalTips] = useState<LocalTips | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocalTips = useCallback(
    async (forceRefresh = false): Promise<void> => {
      const normalizedDestination = destination.trim();
      if (!normalizedDestination) {
        setLocalTips(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          city: normalizedDestination,
          includeLocalTips: "1",
        });
        if (startDate) {
          params.set("startDate", startDate);
        }
        if (endDate) {
          params.set("endDate", endDate);
        }
        if (forceRefresh) {
          params.set("refresh", String(Date.now()));
        }
        const response = await fetch(`/api/travel-updates/weather?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Local intelligence API returned ${response.status}`);
        }
        const payload = (await response.json()) as { localTips?: LocalTips | null };
        setLocalTips(payload.localTips ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load local tips.");
        setLocalTips(null);
      } finally {
        setLoading(false);
      }
    },
    [destination, endDate, startDate],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLocalTips(false);
    }, 0);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadLocalTips]);

  const hasTips = useMemo(
    () => Boolean(localTips && Object.values(localTips).some((items) => items.length > 0)),
    [localTips],
  );

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Local intelligence</h2>
          <p className="text-xs text-slate-400">Destination-specific execution tips for arrival and first nights.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadLocalTips(true);
          }}
          className="rounded-md bg-slate-800 px-2 py-1 text-xs ring-1 ring-slate-700 hover:bg-slate-700"
        >
          Refresh tips
        </button>
      </div>

      {loading ? <p className="mt-3 text-xs text-slate-400">Generating local tips...</p> : null}
      {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      {!loading && !error && !hasTips ? (
        <p className="mt-3 text-xs text-slate-400">No local tips available yet. Try refreshing.</p>
      ) : null}

      {hasTips && localTips ? (
        <div className="mt-3 space-y-2">
          {SECTION_CONFIG.map((section) => {
            const tips = localTips[section.key];
            if (!tips || tips.length === 0) {
              return null;
            }
            return (
              <details key={section.key} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-100">{section.title}</summary>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                  {tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
