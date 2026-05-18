import type { CSSProperties, ReactElement } from "react";

export interface WeeklyDigestTripItem {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  reservationCount: number;
}

export interface WeeklyDigestTemplateProps {
  upcomingTrips: WeeklyDigestTripItem[];
  pendingReviewCount: number;
  isFreePlan: boolean;
  appLink: string;
  billingLink: string;
  unsubscribeLink: string;
}

const shellStyle: CSSProperties = {
  margin: 0,
  padding: "24px 12px",
  backgroundColor: "#f8fafc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  color: "#0f172a",
};

export function WeeklyDigestEmail({
  upcomingTrips,
  pendingReviewCount,
  isFreePlan,
  appLink,
  billingLink,
  unsubscribeLink,
}: WeeklyDigestTemplateProps): ReactElement {
  return (
    <html>
      <body style={shellStyle}>
        <section
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
          }}
        >
          <header style={{ padding: "18px 20px", backgroundColor: "#0f172a", color: "#f8fafc" }}>
            <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Kepi weekly digest
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: "22px", lineHeight: 1.3 }}>Your next 14 days at a glance</h1>
          </header>

          <div style={{ padding: "16px 20px 6px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#334155" }}>
              Upcoming trips: <strong>{upcomingTrips.length}</strong>
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#334155" }}>
              Reservations pending review: <strong>{pendingReviewCount}</strong>
            </p>
          </div>

          <div style={{ padding: "0 20px 10px" }}>
            {upcomingTrips.length > 0 ? (
              upcomingTrips.map((trip) => (
                <article
                  key={trip.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "12px",
                    marginBottom: "10px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                    {trip.name} - {trip.destination}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#334155" }}>
                    {trip.startDate} to {trip.endDate}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#334155" }}>
                    Reservations: {trip.reservationCount}
                  </p>
                </article>
              ))
            ) : (
              <p style={{ margin: "0 0 10px", fontSize: "14px", color: "#475569" }}>
                No trips are currently scheduled in the next 14 days.
              </p>
            )}
          </div>

          {isFreePlan ? (
            <div
              style={{
                margin: "0 20px 12px",
                padding: "12px",
                border: "1px solid #a5f3fc",
                borderRadius: "10px",
                backgroundColor: "#ecfeff",
              }}
            >
              <p style={{ margin: 0, fontSize: "14px", color: "#0f172a", lineHeight: 1.5 }}>
                Upgrade to Pro to unlock AI disruption guidance, Gmail auto-import, and premium trip automation.
              </p>
              <a
                href={billingLink}
                style={{
                  display: "inline-block",
                  marginTop: "10px",
                  textDecoration: "none",
                  backgroundColor: "#06b6d4",
                  color: "#082f49",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                Upgrade to Pro
              </a>
            </div>
          ) : null}

          <div style={{ padding: "0 20px 20px" }}>
            <a href={appLink} style={{ color: "#0f766e", fontSize: "14px", fontWeight: 700 }}>
              Open travel dashboard
            </a>
            <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
              To stop receiving these emails,{" "}
              <a href={unsubscribeLink} style={{ color: "#0f766e" }}>
                unsubscribe
              </a>
              .
            </p>
          </div>
        </section>
      </body>
    </html>
  );
}
