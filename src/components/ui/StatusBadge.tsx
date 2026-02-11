import { STATUS_COLORS } from '../../lib/utils';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || { bg: 'bg-slate-100', text: 'text-slate-700' };
  const displayLabel = label || status.replace('_', ' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colors.bg} ${colors.text}`}>
      {displayLabel}
    </span>
  );
}
