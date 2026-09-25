import { useState } from 'react';
import type { TableSpec } from '@/calculators/types';
import { downloadCSV, toCSV } from '@/lib/export';
import { useToast } from './Toast';
import { Icon } from './Icon';
import { useT } from '@/hooks/PreferencesContext';

export function DataTable({ spec }: { spec: TableSpec }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const { notify } = useToast();

  const preview = spec.previewRows ?? 12;
  const rows = expanded ? spec.rows : spec.rows.slice(0, preview);
  const hidden = spec.rows.length - rows.length;

  const exportCsv = () => {
    const csv = toCSV(spec.columns, (spec.csvRows ?? spec.rows) as Record<string, unknown>[]);
    downloadCSV(spec.csvName ?? 'finora-projection', csv);
    notify('CSV downloaded');
  };

  return (
    <section className="card">
      <div className="card-head">
        <h3>{t(spec.title)}</h3>
        <button type="button" className="btn ghost sm no-print" style={{ marginLeft: 'auto' }} onClick={exportCsv}>
          <Icon name="download" size={15} />
          CSV
        </button>
      </div>

      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              {spec.columns.map((c) => (
                <th key={c.key} scope="col" className={c.align === 'left' ? '' : 'num'}>
                  {t(c.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {spec.columns.map((c, ci) =>
                  ci === 0 ? (
                    <th key={c.key} scope="row" style={{ fontWeight: 600 }}>
                      {row[c.key]}
                    </th>
                  ) : (
                    <td key={c.key} className="num">
                      {row[c.key]}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
          {spec.footer && (
            <tfoot>
              <tr>
                {spec.columns.map((c, ci) => (
                  <td key={c.key} className={ci === 0 ? '' : 'num'}>
                    {spec.footer?.[c.key] ?? ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {(hidden > 0 || expanded) && spec.rows.length > preview && (
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }} className="no-print">
          <button type="button" className="btn subtle sm block" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Show less' : `Show all ${spec.rows.length} rows`}
          </button>
        </div>
      )}

      {spec.note && (
        <p className="small muted" style={{ padding: '0 18px 14px', margin: 0 }}>
          {t(spec.note)}
        </p>
      )}
    </section>
  );
}
