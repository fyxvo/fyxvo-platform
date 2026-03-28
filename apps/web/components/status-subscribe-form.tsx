"use client";

import { EmailSubscribeForm } from "./email-subscribe-form";

export function StatusSubscribeForm() {
  return (
    <EmailSubscribeForm
      endpoint="/v1/status/subscribe"
      buttonLabel="Join list"
      successMessage="Your email is now subscribed to incident and resolution updates."
      source="status-page"
      compact
      inputLabel="Status subscription email"
    />
  );
}
