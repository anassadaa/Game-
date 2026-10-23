import { SUBTABS } from './subtabs.ts';
export function SubTabs({ tab, value, onChange }: { tab: string; value: string | null; onChange: (id: string) => void }) {
  const list = SUBTABS[tab];
  if (!list) return null;
  return (
    <div className="subtabs" role="tablist">
      {list.map((s) => (
        <button key={s.id} role="tab" aria-selected={value === s.id} className={value === s.id ? 'active' : ''} onClick={() => onChange(s.id)}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
