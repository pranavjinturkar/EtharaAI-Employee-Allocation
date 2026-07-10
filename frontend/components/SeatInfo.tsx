import { SeatInfo as SeatInfoType } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function SeatInfo({ info }: { info?: SeatInfoType | null }) {
  if (!info) {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 rounded-full border-0">Unassigned</Badge>;
  }
  return (
    <span className="text-sm text-ethara-slate whitespace-nowrap">
      Floor {info.floor} · Zone {info.zone} · Seat {info.seat_number}
    </span>
  );
}
