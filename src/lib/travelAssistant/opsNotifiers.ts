import type { TravelOpsAlertEvent } from "@/lib/travelAssistant/travelUpdateTypes";

export interface TravelOpsNotifier {
  name: string;
  send(args: { alert: TravelOpsAlertEvent }): Promise<{ ok: boolean; detail: string }>;
}

async function sendJson(url: string, body: unknown): Promise<{ ok: boolean; detail: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { ok: false, detail: `HTTP ${response.status}` };
    }
    return { ok: true, detail: "accepted" };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "request failed" };
  }
}

function buildWebhookNotifier(url: string): TravelOpsNotifier {
  return {
    name: "webhook",
    async send({ alert }) {
      return sendJson(url, { alert, source: "travel-ops" });
    },
  };
}

function buildEmailNotifier(url: string): TravelOpsNotifier {
  return {
    name: "email",
    async send({ alert }) {
      return sendJson(url, {
        subject: `[Travel Ops] ${alert.title}`,
        text: `${alert.message}\nSeverity: ${alert.severity}\nTrigger: ${alert.trigger}`,
        alert,
      });
    },
  };
}

function buildSmsNotifier(url: string): TravelOpsNotifier {
  return {
    name: "sms",
    async send({ alert }) {
      return sendJson(url, {
        message: `[Travel Ops/${alert.severity}] ${alert.title} - ${alert.message}`,
        alert,
      });
    },
  };
}

function buildConsoleNotifier(): TravelOpsNotifier {
  return {
    name: "console",
    async send({ alert }) {
      const prefix = alert.severity === "critical" ? "[CRITICAL]" : "[WARN]";
      // eslint-disable-next-line no-console
      console.warn(`${prefix} Travel Ops alert: ${alert.title} :: ${alert.message}`);
      return { ok: true, detail: "logged" };
    },
  };
}

export function resolveTravelOpsNotifiersFromEnv(): TravelOpsNotifier[] {
  const notifiers: TravelOpsNotifier[] = [];
  const webhookUrl = process.env.TRAVEL_ALERT_WEBHOOK_URL?.trim();
  const emailEndpoint = process.env.TRAVEL_ALERT_EMAIL_ENDPOINT?.trim();
  const smsEndpoint = process.env.TRAVEL_ALERT_SMS_ENDPOINT?.trim();
  const consoleEnabled = (process.env.TRAVEL_ALERT_CONSOLE_ENABLED ?? "true").toLowerCase() !== "false";

  if (webhookUrl) notifiers.push(buildWebhookNotifier(webhookUrl));
  if (emailEndpoint) notifiers.push(buildEmailNotifier(emailEndpoint));
  if (smsEndpoint) notifiers.push(buildSmsNotifier(smsEndpoint));
  if (consoleEnabled || notifiers.length === 0) {
    notifiers.push(buildConsoleNotifier());
  }
  return notifiers;
}
