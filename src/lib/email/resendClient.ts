import "server-only";

import { Resend } from "resend";

let cachedResendClient: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Kepi Travel <no-reply@kepi.app>";
}

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  if (!cachedResendClient) {
    cachedResendClient = new Resend(apiKey);
  }
  return cachedResendClient;
}
