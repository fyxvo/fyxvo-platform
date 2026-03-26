type EmailSenderConfig = {
  readonly apiKey: string | undefined;
  readonly from: string | undefined;
  readonly replyTo?: string | undefined;
  readonly baseUrl?: string | undefined;
};

type SendEmailInput = {
  readonly to: string | readonly string[];
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
};

function normalizeRecipients(value: string | readonly string[]) {
  return Array.isArray(value) ? value : [value];
}

export function isEmailDeliveryEnabled(config: EmailSenderConfig) {
  return Boolean(config.apiKey?.trim() && config.from?.trim());
}

export async function sendTransactionalEmail(config: EmailSenderConfig, input: SendEmailInput) {
  if (!isEmailDeliveryEnabled(config)) {
    throw new Error("Email delivery is not configured.");
  }

  const response = await fetch(`${config.baseUrl ?? "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: normalizeRecipients(input.to),
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Email delivery failed with ${response.status}: ${body || "Unknown provider error"}`);
  }
}
