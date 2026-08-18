import nodemailer from "nodemailer";
import { isLocalDev, isMailerConfigured } from "./password-reset.js";

let smtpTransporter: nodemailer.Transporter | null = null;

function mailFrom(): string {
  return process.env.SMTP_FROM?.trim()
    || process.env.RESEND_FROM?.trim()
    || `"Sweet Tooth Support" <support@sweettooth.com>`;
}

async function sendWithResend(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ messageId: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${body.slice(0, 300)}`);
  }

  try {
    const parsed = JSON.parse(body) as { id?: string };
    return { messageId: parsed.id || "resend" };
  } catch {
    return { messageId: "resend" };
  }
}

async function getSmtpTransporter(): Promise<nodemailer.Transporter> {
  if (smtpTransporter) return smtpTransporter;

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = process.env.SMTP_PORT?.trim();

  if (host && user && pass) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port: port ? Number.parseInt(port, 10) : 587,
      secure: port === "465",
      auth: { user, pass },
    });
    return smtpTransporter;
  }

  if (!isLocalDev()) {
    throw new Error("SMTP is not configured");
  }

  console.log("No SMTP environment variables set. Creating an Ethereal test account...");
  try {
    const testAccount = await nodemailer.createTestAccount();
    smtpTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (err) {
    console.error("Failed to create Ethereal test account, logging to console instead:", err);
    smtpTransporter = {
      sendMail: async (mailOptions: nodemailer.SendMailOptions) => {
        console.log("=== MOCK EMAIL SENT ===");
        console.log("To:", mailOptions.to);
        console.log("Subject:", mailOptions.subject);
        console.log("Body:", mailOptions.text || mailOptions.html);
        console.log("========================");
        return { messageId: "mock-id" };
      },
    } as unknown as nodemailer.Transporter;
  }

  return smtpTransporter;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ messageId?: string; previewUrl?: string }> {
  if (process.env.RESEND_API_KEY?.trim()) {
    return sendWithResend({ to, subject, html, text });
  }

  if (!isMailerConfigured() && !isLocalDev()) {
    throw new Error("Email is not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS.");
  }

  const mailTransporter = await getSmtpTransporter();
  const info = await mailTransporter.sendMail({
    from: mailFrom(),
    to,
    subject,
    html,
    text,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`✉️ Email preview URL: ${previewUrl}`);
    return { previewUrl };
  }
  return { messageId: info.messageId };
}
