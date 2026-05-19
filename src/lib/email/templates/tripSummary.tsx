import type { CSSProperties, ReactElement } from "react";

export interface TripSummaryReservationItem {
  id: string;
  type: string;
  title: string;
  provider: string;
  localTime: string;
  timezone: string;
  location: string;
  confirmationCode: string;
  flightStatus?: string | null;
}

export interface TripSummaryTemplateProps {
  tripName: string;
  destination: string;
  departureDateLabel: string;
  weatherSummary: string | null;
  weatherForecast?: Array<{
    date: string;
    condition: string;
    minTempC: string;
    maxTempC: string;
  }>;
  localTips?: {
    bestAreasToStay: string[];
    localTransportTips: string[];
    currencyAndTippingCustoms: string[];
    safetyNotes: string[];
    packingSuggestions: string[];
  } | null;
  reservations: TripSummaryReservationItem[];
  appLink: string;
  unsubscribeLink: string;
}

const shellStyle: CSSProperties = {
  margin: 0,
  padding: "24px 12px",
  backgroundColor: "#f3f4f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  color: "#0f172a",
};

const cardStyle: CSSProperties = {
  maxWidth: "640px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  overflow: "hidden",
};

const chipStyle: CSSProperties = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 600,
  backgroundColor: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #a5f3fc",
};

export function TripSummaryEmail({
  tripName,
  destination,
  departureDateLabel,
  weatherSummary,
  weatherForecast,
  localTips,
  reservations,
  appLink,
  unsubscribeLink,
}: TripSummaryTemplateProps): ReactElement {
  const hasLocalTips = Boolean(localTips && Object.values(localTips).some((tips) => tips.length > 0));

  return (
    <html>
      <body style={shellStyle}>
        <section style={cardStyle}>
          <header style={{ padding: "20px 20px 14px", backgroundColor: "#0f172a", color: "#f8fafc" }}>
            <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Kepi Travel Assistant
            </p>
            <h1 style={{ margin: "8px 0 4px", fontSize: "24px", lineHeight: 1.25 }}>Your trip summary (24h out)</h1>
            <p style={{ margin: 0, fontSize: "14px", color: "#cbd5e1" }}>
              {tripName} - {destination}
            </p>
          </header>

          <div style={{ padding: "16px 20px 4px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#334155" }}>
              Departure window: <strong>{departureDateLabel}</strong>
            </p>
            <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#334155" }}>
              Weather at destination: {weatherSummary ?? "Unavailable right now. Keep checking before departure."}
            </p>
            {weatherForecast && weatherForecast.length > 0 ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                {weatherForecast.slice(0, 3).map((day) => (
                  <span
                    key={`${day.date}-${day.condition}`}
                    style={{
                      ...chipStyle,
                      backgroundColor: "#eef2ff",
                      border: "1px solid #c7d2fe",
                      color: "#3730a3",
                    }}
                  >
                    {day.date}: {day.condition} ({day.maxTempC}/{day.minTempC})
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ padding: "0 20px 10px" }}>
            {reservations.map((reservation) => (
              <article
                key={reservation.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "12px",
                  marginBottom: "10px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <p style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>{reservation.title}</p>
                  <span style={chipStyle}>{reservation.type.toUpperCase()}</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#334155" }}>
                  {reservation.localTime} ({reservation.timezone})
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#334155" }}>
                  {reservation.provider} - {reservation.location}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#334155" }}>
                  Confirmation: <strong>{reservation.confirmationCode}</strong>
                </p>
                {reservation.flightStatus ? (
                  <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#0f766e" }}>
                    Flight status: <strong>{reservation.flightStatus}</strong>
                  </p>
                ) : null}
              </article>
            ))}
          </div>

          <div style={{ padding: "8px 20px 20px" }}>
            {hasLocalTips && localTips ? (
              <section
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  backgroundColor: "#f8fafc",
                  padding: "12px",
                  marginBottom: "12px",
                }}
              >
                <p style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700 }}>Local intelligence briefing</p>
                {[
                  ["Best areas", localTips.bestAreasToStay],
                  ["Transport", localTips.localTransportTips],
                  ["Currency & tipping", localTips.currencyAndTippingCustoms],
                  ["Safety", localTips.safetyNotes],
                  ["Packing", localTips.packingSuggestions],
                ].map(([label, tips]) =>
                  Array.isArray(tips) && tips.length > 0 ? (
                    <div key={String(label)} style={{ marginBottom: "8px" }}>
                      <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{label}</p>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#334155", lineHeight: 1.6 }}>
                        {tips.slice(0, 2).map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
              </section>
            ) : null}
            <a
              href={appLink}
              style={{
                display: "inline-block",
                textDecoration: "none",
                backgroundColor: "#06b6d4",
                color: "#082f49",
                padding: "10px 16px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              Open trip dashboard
            </a>
            <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
              You are receiving this because trip alerts are enabled for your account.{" "}
              <a href={unsubscribeLink} style={{ color: "#0f766e" }}>
                Unsubscribe from transactional emails
              </a>
              .
            </p>
          </div>
        </section>
      </body>
    </html>
  );
}
