import { formatSgd } from '@/lib/format';
import { MicroLabel } from './MicroLabel';

export function Figure({
  label,
  value,
  size = 'lg',
}: {
  label: string;
  value: number;
  size?: 'lg' | 'md';
}) {
  return (
    <div>
      <MicroLabel>{label}</MicroLabel>
      <div className={`figure ${size === 'lg' ? 'text-4xl' : 'text-2xl'} leading-tight`}>
        {formatSgd(value)}
      </div>
    </div>
  );
}
