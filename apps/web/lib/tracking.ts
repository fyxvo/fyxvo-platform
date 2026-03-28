import { trackProductEvent } from "./api";

export async function track(event: string, properties?: Record<string, unknown>): Promise<void> {
  try {
    await trackProductEvent({
      name: "landing_cta_clicked",
      source: event,
      properties: properties ?? {},
    });
  } catch {
    // Tracking failures are non-fatal
  }
}
