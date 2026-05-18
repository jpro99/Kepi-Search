import { NextResponse } from "next/server";
import { z } from "zod";
import { setEmailUnsubscribed } from "@/lib/email/emailService";
import { logger } from "@/lib/logger";

const BodySchema = z.object({
  userId: z.string().trim().min(1),
});

function htmlMessage(title: string, description: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin:0; padding:32px 14px; background:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color:#0f172a; }
      .card { max-width:520px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:20px; }
      h1 { margin:0 0 8px; font-size:22px; }
      p { margin:0; line-height:1.55; color:#334155; }
    </style>
  </head>
  <body>
    <section class="card">
      <h1>${title}</h1>
      <p>${description}</p>
    </section>
  </body>
</html>`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId")?.trim() ?? "";
  if (!userId) {
    return new NextResponse(
      htmlMessage("Missing unsubscribe details", "This unsubscribe link is missing a user identifier."),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  await setEmailUnsubscribed(userId, true);
  logger.info("Transactional email unsubscribe applied.", {
    scope: "api/email/unsubscribe",
    userId,
  });
  return new NextResponse(
    htmlMessage(
      "You are unsubscribed",
      "Transactional emails have been disabled for this Kepi account. You can re-enable them later from settings.",
    ),
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

export async function POST(req: Request) {
  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }
  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 422 },
    );
  }
  await setEmailUnsubscribed(parsed.data.userId, true);
  return NextResponse.json({ ok: true });
}
