"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ReservationType = "flight" | "hotel" | "train" | "ride" | "dinner";

interface TripSearchReservation {
  id: string;
  type: ReservationType;
  title: string;
  confirmationCode: string;
  localTime: string;
}

interface TripSearchTrip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  reservations: TripSearchReservation[];
}

export interface TripSearchSelection {
  tripId: string;
  reservationId: string | null;
}

interface TripSearchProps {
  trips: TripSearchTrip[];
  onSelectResult: (selection: TripSearchSelection) => Promise<void> | void;
  disabled?: boolean;
}

type SearchResult = {
  id: string;
  tripId: string;
  reservationId: string | null;
  tripName: string;
  reservationType: string;
  confirmationCode: string;
  dateValue: string;
  subtitle: string;
};

function normalizedText(value: string): string {
  return value.toLowerCase().trim();
}

export function TripSearch({ trips, onSelectResult, disabled = false }: TripSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const needle = normalizedText(query);
    if (!needle) {
      return [] as SearchResult[];
    }
    const generated: SearchResult[] = [];
    for (const trip of trips) {
      const tripBlob = normalizedText(`${trip.name} ${trip.destination} ${trip.startDate} ${trip.endDate}`);
      if (tripBlob.includes(needle)) {
        generated.push({
          id: `trip-${trip.id}`,
          tripId: trip.id,
          reservationId: null,
          tripName: trip.name,
          reservationType: "trip",
          confirmationCode: "n/a",
          dateValue: `${trip.startDate} - ${trip.endDate}`,
          subtitle: `${trip.destination}`,
        });
      }
      for (const reservation of trip.reservations) {
        const reservationBlob = normalizedText(
          `${reservation.type} ${reservation.title} ${reservation.confirmationCode} ${reservation.localTime}`,
        );
        if (!reservationBlob.includes(needle)) {
          continue;
        }
        generated.push({
          id: `${trip.id}-${reservation.id}`,
          tripId: trip.id,
          reservationId: reservation.id,
          tripName: trip.name,
          reservationType: reservation.type,
          confirmationCode: reservation.confirmationCode || "n/a",
          dateValue: reservation.localTime,
          subtitle: reservation.title,
        });
      }
    }
    return generated.slice(0, 16);
  }, [query, trips]);

  const handleSelectResult = useCallback(
    async (result: SearchResult): Promise<void> => {
      await onSelectResult({
        tripId: result.tripId,
        reservationId: result.reservationId,
      });
      setOpen(false);
      setQuery("");
    },
    [onSelectResult],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (window.innerWidth < 1024) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative min-w-72 flex-1">
      <input
        ref={inputRef}
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder="Search trips/reservations (press /)"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none ring-cyan-300 transition focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      {open && query.trim().length > 0 ? (
        <div className="absolute left-0 top-[calc(100%+0.4rem)] z-30 w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto p-2">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSelectResult(result);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <p className="font-semibold">{result.tripName}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">{result.subtitle}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {result.reservationType} • {result.confirmationCode} • {result.dateValue}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">No matching trips or reservations.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
