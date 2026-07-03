import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

const CONFIG = {
  'Menunggu Approval': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  'Disetujui': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  'Ditolak': { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

export default function PKWTApprovalBadge({ status }) {
  if (!status) return null;
  const cfg = CONFIG[status] || { color: 'bg-gray-100 text-gray-600', icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}