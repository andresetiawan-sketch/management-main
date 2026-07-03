import { Card } from "@/components/ui/card";

export default function StatCard({ title, value, icon: Icon, trend, color = "maroon" }) {
  const colorMap = {
    maroon: "bg-[var(--maroon-50)] text-[var(--maroon)]",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <Card className="p-5 hover:shadow-lg transition-all duration-300 border-0 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-xs text-emerald-600 font-medium">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}