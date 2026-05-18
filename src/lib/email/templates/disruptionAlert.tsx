import type { CSSProperties, ReactElement } from "react";

export interface DisruptionAlertTemplateProps {
  tripName: string;
  destination: string;
  affectedReservationTitle: string;
  disruptionType: string;
  severity: string;
  detail: string;
  recommendations: string[];
  appLink: string;
  unsubscribeLink: string;
}

const shellStyle: CSSProperties = {
  margin: 0,
  padding: "24px 12px",
  backgroundColor: "#0f172a",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  color: "#e2e8f0",
};

export function DisruptionAlertEmail({
  tripName,
  destination,
  affectedReservationTitle,
  disruptionType,
  severity,
  detail,
  recommendations,
  appLink,
  unsubscribeLink,
}: DisruptionAlertTemplateProps): ReactElement {
  return (
    <html>
      <body style={shellStyle}>
        <section
          style={{
            maxWidth: "620px",
            margin: "0 auto",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid #334155",
            backgroundColor: "#111827",
          }}
        >
          <header style={{ padding: "18px 20px", backgroundColor: "#7f1d1d" }}>
            <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Kepi disruption alert
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: "22px", lineHeight: 1.3 }}>
              Action needed: {disruptionType.replaceAll("-", " ")}
            </h1>
          </header>

          <div style={{ padding: "16px 20px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#cbd5e1" }}>
              {tripName} - {destination}
            </p>
            <p style={{ margin: "10px 0 0", fontSize: "14px" }}>
              Affected reservation: <strong>{affectedReservationTitle}</strong>
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "14px" }}>
              Severity: <strong>{severity.toUpperCase()}</strong>
            </p>
            <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.55, color: "#cbd5e1" }}>{detail}</p>
          </div>

          <div style={{ padding: "0 20px 8px" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "16px" }}>Top autopilot recommendations</h2>
            <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", lineHeight: 1.7 }}>
              {recommendations.slice(0, 3).map((recommendation) => (
                <li key={recommendation}>{recommendation}</li>
              ))}
            </ol>
          </div>

          <div style={{ padding: "16px 20px 20px" }}>
            <a
              href={appLink}
              style={{
                display: "inline-block",
                textDecoration: "none",
                backgroundColor: "#f59e0b",
                color: "#111827",
                padding: "10px 16px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              Open recovery mode now
            </a>
            <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>
              One-click unsubscribe available here:{" "}
              <a href={unsubscribeLink} style={{ color: "#22d3ee" }}>
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
