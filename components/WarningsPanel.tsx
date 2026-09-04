import { MicroLabel } from './MicroLabel';

export function WarningsPanel({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="border border-warn/40 bg-warn/5 p-4 rounded">
      <MicroLabel>worth a chat</MicroLabel>
      <ul className="mt-2 space-y-2 text-sm">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
