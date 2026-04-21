import Link from "next/link";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Dashboard root. Shows a card per client. Clicking enters the per-client
 * page. Inactive clients are visible but disabled to tell the "horizontal
 * expansion" story at a glance.
 */
export default function DashboardIndex() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          クライアント案件の広告パフォーマンスダッシュボード。
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
                <CardDescription>{c.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {c.active ? "広告パフォーマンスを見る →" : "準備中"}
              </CardContent>
            </Card>
          );
          return c.active ? (
            <Link key={id} href={`/dashboard/${id}`}>
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
