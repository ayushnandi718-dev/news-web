import { BRAND, siteUrl } from "@/lib/brand";

let warned = false;

async function transporter() {
  const mod = (await eval("import('nodemailer')")) as typeof import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
  return mod.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const tx = await transporter();
  await tx.sendMail({
    from: process.env.MAIL_FROM ?? `${BRAND.bn} <${process.env.SMTP_USER ?? "no-reply@localhost"}>`,
    to,
    subject,
    html,
  });
}

/**
 * Sends an email when SMTP is available; otherwise logs the intended mail
 * to the server console so dev flows keep working. Returns how it was delivered.
 */
export async function sendMailOrLog(
  to: string,
  subject: string,
  html: string,
  logFallback?: { label: string; url: string }
): Promise<"sent" | "logged" | "failed"> {
  if (!smtpConfigured()) {
    if (!warned) {
      console.log("[mailer] SMTP not configured — mails will be logged instead. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM in .env");
      warned = true;
    }
    if (logFallback) console.log(`[mailer] ${logFallback.label}: ${logFallback.url}`);
    return "logged";
  }
  try {
    await sendMail(to, subject, html);
    return "sent";
  } catch (err) {
    console.error("[mailer] send failed:", err);
    if (logFallback) console.log(`[mailer] ${logFallback.label}: ${logFallback.url}`);
    return "failed";
  }
}

export function brandedEmail(title: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string): string {
  return `<div style="font-family:sans-serif;max-width:520px;margin:auto">
    <h2 style="color:#b91c1c">${BRAND.bn}</h2>
    <p style="font-weight:bold">${title}</p>
    <div style="color:#374151;font-size:14px">${bodyHtml}</div>
    ${ctaLabel && ctaUrl ? `<p><a href="${ctaUrl.startsWith("http") ? ctaUrl : siteUrl() + ctaUrl}" style="background:#b91c1c;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:8px">${ctaLabel}</a></p>` : ""}
  </div>`;
}
