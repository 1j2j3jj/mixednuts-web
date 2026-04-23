import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CLIENTS, getClientBySlug } from "@/config/clients";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { switchClient } from "./actions";

/**
 * Client-picker for multi-client (agency-staff) sessions.
 *
 * Accessible when the mn_session has kind=client-multi. Single-client and
 * admin viewers are redirected immediately — they never need this page
 * (admin has the full Admin Index; single-client is already gated to one slug).
 *
 * The "Open" button calls the switchClient server action, which re-signs
 * the cookie with the chosen currentSlug and redirects to that dashboard.
 */
export const dynamic = "force-dynamic";

export default async function SelectClientPage() {
  const h = await headers();
  const viewerKind = h.get("x-viewer-kind");

  // Non-multi viewers should not be here.
  if (viewerKind !== "client-multi") {
    // admin → admin index; single-client → middleware already handles routing
    redirect("/dashboard");
  }

  const slugHeader = h.get("x-viewer-available-slugs") ?? "";
  const availableSlugs = slugHeader.split(",").filter(Boolean);

  // Filter to active clients only; if deactivated client drops count to 1,
  // auto-redirect so the user doesn't see a one-card picker.
  const accessibleClients = availableSlugs
    .map((slug) => getClientBySlug(slug))
    .filter((c): c is NonNullable<typeof c> => c !== null && c.active);

  if (accessibleClients.length === 0) {
    // All clients deactivated — deny gracefully.
    redirect("/login?error=no_active_client");
  }

  if (accessibleClients.length === 1) {
    // Only one active client left — skip the picker.
    redirect(`/dashboard/${accessibleClients[0].slug}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">クライアントを選択</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          アクセス可能なダッシュボードを選んでください。
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {accessibleClients.map((client) => (
          <form key={client.id} action={switchClient.bind(null, client.slug)}>
            <button
              type="submit"
              className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              <Card className="h-full cursor-pointer transition-colors hover:border-primary/60 hover:bg-muted/30">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{client.label}</CardTitle>
                    <Badge variant="success">Live</Badge>
                  </div>
                  <CardDescription>{client.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-primary font-medium">
                  開く →
                </CardContent>
              </Card>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
