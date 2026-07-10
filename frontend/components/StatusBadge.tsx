import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  let bg = "bg-gray-100";
  let text = "text-gray-800";

  switch (status) {
    case 'ACTIVE':
    case 'AVAILABLE':
      bg = "bg-ethara-green/20";
      text = "text-[#3A7563]";
      break;
    case 'INACTIVE':
    case 'MAINTENANCE':
      bg = "bg-gray-200";
      text = "text-gray-700";
      break;
    case 'PENDING_ALLOCATION':
    case 'RESERVED':
      bg = "bg-amber-100";
      text = "text-amber-800";
      break;
    case 'OCCUPIED':
      bg = "bg-ethara-purple/20";
      text = "text-ethara-purple";
      break;
  }

  return (
    <Badge className={`${bg} ${text} hover:${bg} rounded-full whitespace-nowrap`}>
      {status.replace("_", " ")}
    </Badge>
  );
}
