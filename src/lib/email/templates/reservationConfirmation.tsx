import type { CSSProperties, ReactElement } from "react";

export interface ReservationConfirmationTemplateProps {
  tripName: string;
  reservationTitle: string;
  reservationType: string;
  provider: string;
  localTime: string;
  timezone: string;
  location: string;
  confirmationCode: string;
  googleCalendarUrl: string;
  appleCalendarUrl: string;
  appLink: string;
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

export function ReservationConfirmationEmail({
  tripName,
  reservationTitle,
  reservationType,
  provider,
  localTime,
  timezone,
  location,
  confirmationCode,
  googleCalendarUrl,
  appleCalendarUrl,
  appLink,
  unsubscribeLink,
}: ReservationConfirmationTemplateProps): ReactElement {
  return (
    <html>
      <body style={shellStyle}>
        <section
          style={{
            maxWidth: "620px",
            margin: "0 auto",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid #dbeafe",
            backgroundColor: "#ffffff",
          }}
        >
          <header style={{ padding: "18px 20px", backgroundColor: "#1d4ed8", color: "#eff6ff" }}>
            <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Kepi booking confirmation
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: "22px", lineHeight: 1.3 }}>
              Reservation approved and added
            </h1>
          </header>

          <div style={{ padding: "16px 20px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#334155" }}>Trip: {tripName}</p>
            <h2 style={{ margin: "10px 0 6px", fontSize: "19px" }}>{reservationTitle}</h2>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              Type: <strong>{reservationType.toUpperCase()}</strong>
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              Provider: <strong>{provider}</strong>
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              Time: <strong>{localTime}</strong> ({timezone})
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              Location: <strong>{location}</strong>
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              Confirmation #: <strong>{confirmationCode}</strong>
            </p>
          </div>

          <div style={{ padding: "0 20px 8px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#334155" }}>Add this reservation to calendar:</p>
            <a
              href={googleCalendarUrl}
              style={{
                display: "inline-block",
                textDecoration: "none",
                backgroundColor: "#0ea5e9",
                color: "#082f49",
                padding: "9px 12px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                marginRight: "8px",
                marginBottom: "8px",
              }}
            >
              Add to Google Calendar
            </a>
            <a
              href={appleCalendarUrl}
              style={{
                display: "inline-block",
                textDecoration: "none",
                backgroundColor: "#e2e8f0",
                color: "#0f172a",
                padding: "9px 12px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                marginBottom: "8px",
              }}
            >
              Add to Apple Calendar
            </a>
          </div>

          <div style={{ padding: "8px 20px 20px" }}>
            <a href={appLink} style={{ color: "#1d4ed8", fontSize: "14px", fontWeight: 700 }}>
              Open trip in Kepi
            </a>
            <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
              Need fewer emails?{" "}
              <a href={unsubscribeLink} style={{ color: "#0f766e" }}>
                Unsubscribe in one click
              </a>
              .
            </p>
          </div>
        </section>
      </body>
    </html>
  );
}
