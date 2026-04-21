import type { Metadata } from "next";

import IntegrationsClient from "./IntegrationsClient";

export const metadata: Metadata = {
  title: "Integrations | Kepi Search",
  description: "API keys and loyalty numbers (encrypted, personal use).",
};

export default function IntegrationsPage() {
  return (
    <div className="min-h-full bg-slate-950 px-4 py-10 text-slate-50">
      <IntegrationsClient />
    </div>
  );
}
