import type { Metadata } from "next";
import { AssistantWorkspace } from "../../components/assistant-workspace";

export const metadata: Metadata = {
  title: "Assistant",
  description:
    "Project-aware AI assistant for onboarding, debugging, funding, and relay operations on Fyxvo."
};

export default function AssistantPage() {
  return <AssistantWorkspace />;
}
