import { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, subtitle }: { icon: LucideIcon, title: string, subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="bg-gray-100 p-4 rounded-full mb-4">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-ethara-slate">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-1 max-w-sm">{subtitle}</p>}
    </div>
  );
}
