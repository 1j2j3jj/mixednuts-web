import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CampaignRow } from "@/lib/metrics";
import { fmtInt, fmtJpy, fmtPct, fmtRatioPct } from "@/lib/utils";

interface Props {
  rows: CampaignRow[];
}

function mediaColour(media: string): string {
  switch (media) {
    case "Google":
      return "bg-blue-100 text-blue-800";
    case "Microsoft":
      return "bg-teal-100 text-teal-800";
    case "Yahoo":
      return "bg-purple-100 text-purple-800";
    case "meta":
      return "bg-sky-100 text-sky-800";
    case "LinkedIn":
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function CampaignTable({ rows }: Props) {
  // Default sort: cost descending. UI sort controls come later.
  const sorted = [...rows].sort((a, b) => b.cost - a.cost);
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>メディア</TableHead>
            <TableHead>B/G</TableHead>
            <TableHead>キャンペーン</TableHead>
            <TableHead className="text-right">費用</TableHead>
            <TableHead className="text-right">Imp</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">CV</TableHead>
            <TableHead className="text-right">CV値</TableHead>
            <TableHead className="text-right">CPA</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground py-6">
                データなし
              </TableCell>
            </TableRow>
          )}
          {sorted.map((r) => (
            <TableRow key={`${r.media}:${r.campaignId}:${r.campaignName}`}>
              <TableCell>
                <span className={`inline-flex rounded px-2 py-0.5 text-xs ${mediaColour(r.media)}`}>{r.media}</span>
              </TableCell>
              <TableCell>
                <Badge variant={r.brandGeneral === "Brand" ? "outline" : "secondary"}>
                  {r.brandGeneral || "—"}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                <div className="max-w-xs truncate" title={r.campaignName}>
                  {r.campaignName || r.campaignId}
                </div>
                {r.campaignId && (
                  <div className="text-[10px] font-mono text-muted-foreground">{r.campaignId}</div>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{fmtJpy(r.cost)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtInt(r.impressions)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtInt(r.clicks)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtPct(r.ctr, 2)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtInt(r.conversions)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtJpy(r.conversionValue)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtJpy(r.cpa)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtRatioPct(r.roasPct, 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
