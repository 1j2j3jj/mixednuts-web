import { TableCell, TableRow } from "@/components/ui/table";
import AbsenceNotice from "@/components/dashboard/AbsenceNotice";
import type {
  AbsenceReason,
  NoDataPeriodDetail,
  NotConfiguredDetail,
} from "@/lib/absence";

interface Props {
  colSpan: number;
  reason: AbsenceReason;
  detail?: NoDataPeriodDetail | NotConfiguredDetail;
}

/** A full-width table row carrying the shared absence notice, for tables
 *  whose body would otherwise silently render zero `<tr>`s (A-12: mixed/
 *  missing absence markers). Same vocabulary as chart/card placements
 *  (AbsenceNotice), just laid out to fit inside a `<tbody>`. */
export default function AbsenceTableRow({ colSpan, reason, detail }: Props) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-0">
        <AbsenceNotice
          reason={reason}
          detail={detail}
          compact
          className="m-3 min-h-0"
        />
      </TableCell>
    </TableRow>
  );
}
