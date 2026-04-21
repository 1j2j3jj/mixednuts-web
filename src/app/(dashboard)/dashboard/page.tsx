import Link from "next/link";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Admin index. Intentionally NOT gated to non-admins in Phase 1 sample — in
 * Phase 2 this will be restricted to Clerk users in INTERNAL_ADMIN_USER_IDS.
 * For now it lists every configured client by name so the CEO can click
 * through to their slug-based URL.
 */
export default function DashboardIndex() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Index</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          内部専用。クライアントには /dashboard/[slug] の URL のみを共有。
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLIENT_IDS.map((id) => {
          const c = CLIENTS[id];
          const card = (
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{c.label}</CardTitle>
                  {c.active ? (
                    <Badge variant="success">Live</Badge>
                  ) : (
                    <Badge variant="secondary">Coming soon</Badge>
                  )}
                </div>
                <CardDescription>
                  {c.subtitle} · <span className="font-mono">/{c.slug}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {c.active ? "ダッシュボードを開く →" : "準備中"}
              </CardContent>
            </Card>
          );
          return c.active ? (
            <Link key={id} href={`/dashboard/${c.slug}`}>
              {card}
            </Link>
          ) : (
            <div key={id} className="opacity-70">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
