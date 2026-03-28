import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {children}
    </div>
  );
}
