import Link from "next/link";
import { getSharedTrip } from "@/lib/travelAssistant/tripShareStore";

type PageProps = {
  params: Promise<{ token: string }>;
};

function FriendlyError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/90 p-6 dark:border-slate-700 dark:bg-slate-900/70">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Get Kepi
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function SharedTripPage({ params }: PageProps) {
  const { token } = await params;
  const shared = await getSharedTrip(token);

  if (shared.status === "invalid" || shared.status === "missing-trip") {
    return (
      <FriendlyError
        title="Share link not found"
        message="This itinerary share link is invalid or no longer available."
      />
    );
  }

  if (shared.status === "expired") {
    return (
      <FriendlyError
        title="Share link expired"
        message="This link has expired. Ask your travel organizer to generate a new one."
      />
    );
  }

  if (shared.status === "revoked") {
    return (
      <FriendlyError
        title="Share link revoked"
        message="This link was revoked by the trip owner and can no longer be used."
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
          Shared itinerary
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{shared.trip.name}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {shared.trip.destination} • {shared.trip.startDate} - {shared.trip.endDate}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Access expires {new Date(shared.expiresAt).toLocaleString()}
        </p>

        <div className="mt-5 space-y-3">
          {shared.trip.reservations.length > 0 ? (
            shared.trip.reservations.map((reservation) => (
              <article
                key={reservation.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {reservation.type} • {reservation.provider}
                    </p>
                    <h2 className="text-sm font-semibold">{reservation.title}</h2>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      reservation.critical
                        ? "bg-red-500/20 text-red-200"
                        : reservation.confidence === "high"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : reservation.confidence === "medium"
                            ? "bg-amber-500/20 text-amber-200"
                            : "bg-red-500/20 text-red-200"
                    }`}
                  >
                    {reservation.critical ? "Critical" : reservation.confidence}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                  {reservation.localTime} ({reservation.timezone})
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{reservation.location}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Confirmation: {reservation.confirmationCode}
                </p>
                {shared.options.showPersonalNotes && reservation.notes ? (
                  <p className="mt-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    Notes: {reservation.notes}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              No reservations shared for this trip yet.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
          <h3 className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">Want your own live travel assistant?</h3>
          <p className="mt-1 text-xs text-cyan-800 dark:text-cyan-200/90">
            Track readiness, flight changes, and disruptions in one adaptive trip workspace.
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Get Kepi
          </Link>
        </div>
      </section>
    </main>
  );
}
