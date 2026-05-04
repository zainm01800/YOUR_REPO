import { NextResponse } from "next/server";
import { z } from "zod";

const enquirySchema = z.object({
  service: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  details: z.string().trim().min(10, "Please add at least 10 characters about what you need help with.").max(4_000),
});

const DEFAULT_TO_EMAIL = "zentra.finance@outlook.com";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid enquiry details." }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return NextResponse.json(
      { error: firstIssue || "Please complete your name, email, service, and enquiry details." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.ENQUIRY_TO_EMAIL || DEFAULT_TO_EMAIL;
  const fromEmail =
    process.env.ENQUIRY_FROM_EMAIL || "Zentra Enquiries <onboarding@resend.dev>";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Enquiry email is not configured yet. Please email zentra.finance@outlook.com directly." },
      { status: 503 },
    );
  }

  const enquiry = parsed.data;
  const subject = `Zentra enquiry - ${enquiry.service}`;
  const text = [
    "New Zentra website enquiry",
    "",
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Service needed: ${enquiry.service}`,
    "",
    "More information:",
    enquiry.details,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">New Zentra website enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(enquiry.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(enquiry.email)}</p>
      <p><strong>Service needed:</strong> ${escapeHtml(enquiry.service)}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="white-space: pre-wrap;">${escapeHtml(enquiry.details)}</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: enquiry.email,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Enquiries] Failed to send email:", errorText);

    let resendMessage = "";
    try {
      const parsedError = JSON.parse(errorText) as { message?: string; error?: string };
      resendMessage = parsedError.message || parsedError.error || "";
    } catch {
      resendMessage = errorText;
    }

    const friendlyMessage = resendMessage.toLowerCase().includes("verify a domain")
      ? "Email sending is almost ready, but the sender domain needs to be verified in Resend first."
      : resendMessage.toLowerCase().includes("own email address")
        ? "Resend test mode can only send to your verified account email. Verify a sending domain to receive customer enquiries at Outlook."
        : "I could not send the enquiry right now. Please try again or email directly.";

    return NextResponse.json(
      { error: friendlyMessage },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
