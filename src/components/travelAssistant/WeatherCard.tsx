"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface WeatherForecastDay {
  date: string;
  minTempC: string;
  maxTempC: string;
  condition: string;
  humidity: string;
  wind: string;
}

interface WeatherForecast {
  temp: string;
  condition: string;
  humidity: string;
  wind: string;
  forecast: WeatherForecastDay[];
}

interface WeatherCardProps {
  destination: string;
}

function iconForCondition(condition: string): string {
  const normalized = condition.toLowerCase();
  if (normalized.includes("snow") || normalized.includes("sleet") || normalized.includes("blizzard")) {
    return "❄️";
  }
  if (normalized.includes("rain") || normalized.includes("drizzle") || normalized.includes("storm")) {
    return "🌧️";
  }
  if (normalized.includes("cloud")) {
    return "⛅";
  }
  return "☀️";
}

function parseTemp(value: string): number | null {
  const match = value.match(/-?\d+/u);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildPackingSuggestion(forecast: WeatherForecastDay[]): string {
  if (forecast.length === 0) {
    return "Pack adaptable layers and recheck weather before departure.";
  }
  const hasRain = forecast.some((day) => /rain|drizzle|storm/iu.test(day.condition));
  const hasCold = forecast.some((day) => {
    const min = parseTemp(day.minTempC);
    return min !== null && min <= 10;
  });
  const hasHeat = forecast.some((day) => {
    const max = parseTemp(day.maxTempC);
    return max !== null && max >= 30;
  });
  if (hasRain && hasCold) {
    return "Pack a light waterproof jacket and closed-toe shoes.";
  }
  if (hasRain) {
    return "Pack a compact umbrella or rain shell.";
  }
  if (hasCold) {
    return "Pack a light jacket for cooler mornings/evenings.";
  }
  if (hasHeat) {
    return "Pack breathable layers and a reusable water bottle.";
  }
  return "Pack lightweight layers for variable conditions.";
}

function formatDateLabel(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleDateString(undefined, { weekday: "short" });
}

export function WeatherCard({ destination }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWeather = useCallback(async (): Promise<void> => {
    const city = destination.trim();
    if (!city) {
      setWeather(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/travel-updates/weather?city=${encodeURIComponent(city)}&days=3`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }
      const payload = (await response.json()) as { weather?: WeatherForecast };
      setWeather(payload.weather ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load weather.");
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [destination]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadWeather();
    }, 0);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadWeather]);

  const packingSuggestion = useMemo(() => buildPackingSuggestion(weather?.forecast ?? []), [weather?.forecast]);

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Destination weather</h2>
          <p className="text-xs text-slate-400">{destination || "Set destination on your trip"}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadWeather();
          }}
          className="rounded-md bg-slate-800 px-2 py-1 text-xs ring-1 ring-slate-700 hover:bg-slate-700"
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="mt-3 text-xs text-slate-400">Loading weather forecast...</p> : null}
      {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}

      {weather ? (
        <>
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
            <p className="text-sm font-semibold text-slate-100">
              {iconForCondition(weather.condition)} {weather.condition}
            </p>
            <p className="text-xs text-slate-300">
              {weather.temp} • Humidity {weather.humidity} • Wind {weather.wind}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {weather.forecast.slice(0, 3).map((day) => (
              <article key={`${day.date}-${day.condition}`} className="rounded-lg border border-slate-700 bg-slate-950/60 p-2">
                <p className="text-xs font-semibold text-slate-100">{formatDateLabel(day.date)}</p>
                <p className="text-base">{iconForCondition(day.condition)}</p>
                <p className="text-[11px] text-slate-300">{day.maxTempC} / {day.minTempC}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-cyan-200">{packingSuggestion}</p>
        </>
      ) : null}
    </section>
  );
}
