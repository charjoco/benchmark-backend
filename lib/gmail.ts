import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "http://localhost"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

export interface RawEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractBody(payload: any): string {
  if (!payload) return "";

  // Plain text part
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // HTML part — strip tags for plain text
  if (payload.mimeType === "text/html" && payload.body?.data) {
    const html = decodeBase64(payload.body.data);
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Multipart — recurse into parts, prefer plain text
  if (payload.parts) {
    const plain = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (plain) return extractBody(plain);
    const html = payload.parts.find((p: any) => p.mimeType === "text/html");
    if (html) return extractBody(html);
    // Nested multipart
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  return "";
}

function extractHeader(headers: any[], name: string): string {
  return headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Fetch unread emails received since the given date, mark them read, return parsed content. */
export async function fetchUnreadEmails(since: Date): Promise<RawEmail[]> {
  const sinceUnix = Math.floor(since.getTime() / 1000);

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: `is:unread after:${sinceUnix}`,
    maxResults: 50,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return [];

  const emails: RawEmail[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;

    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "full",
    });

    const headers = full.data.payload?.headers ?? [];
    const from = extractHeader(headers, "From");
    const subject = extractHeader(headers, "Subject");
    const dateStr = extractHeader(headers, "Date");
    const body = extractBody(full.data.payload);

    // Mark as read
    await gmail.users.messages.modify({
      userId: "me",
      id: msg.id,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });

    emails.push({
      id: msg.id,
      from,
      subject,
      body: body.slice(0, 8000), // cap to keep Claude prompt reasonable
      receivedAt: dateStr ? new Date(dateStr) : new Date(),
    });
  }

  return emails;
}
