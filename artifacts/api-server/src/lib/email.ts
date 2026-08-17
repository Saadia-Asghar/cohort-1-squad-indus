import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : 587,
      secure: port === "465",
      auth: { user, pass },
    });
  } else {
    // Fallback: Ethereal test account for local development
    console.log("No SMTP environment variables set. Creating an Ethereal test account...");
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
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
      // Mock transporter
      transporter = {
        sendMail: async (mailOptions: any) => {
          console.log("=== MOCK EMAIL SENT ===");
          console.log("To:", mailOptions.to);
          console.log("Subject:", mailOptions.subject);
          console.log("Body:", mailOptions.text || mailOptions.html);
          console.log("========================");
          return { messageId: "mock-id" };
        },
      } as unknown as nodemailer.Transporter;
    }
  }
  return transporter;
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
}) {
  const mailTransporter = await getTransporter();
  const info = await mailTransporter.sendMail({
    from: process.env.SMTP_FROM || `"Sweet Tooth Support" <support@sweettooth.com>`,
    to,
    subject,
    html,
    text,
  });

  // If using Ethereal, log preview URL
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`✉️ Email preview URL: ${previewUrl}`);
    return { previewUrl };
  }
  return { messageId: info.messageId };
}
