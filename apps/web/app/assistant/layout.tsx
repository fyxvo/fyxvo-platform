import type { ReactNode } from "react";
import { DashShell } from "../../components/dash-shell";
export default function AssistantLayout({ children }: { readonly children: ReactNode }) {
  return <DashShell>{children}</DashShell>;
}
