import React from 'react';

interface ColumnConfig {
  label?: string;
  dataKey?: string;
}

interface TableProps {
  data: any[];
  config: {
    columns: (string | ColumnConfig)[];
    title?: string;
  };
}

/**
 * Normaliza las columnas para manejar tanto strings como objetos {label, dataKey}
 */
function normalizeColumns(columns: (string | ColumnConfig)[], data: any[]): { label: string; dataKey: string }[] {
  if (!columns || columns.length === 0) {
    // Si no hay columnas definidas, usar las claves del primer registro
    if (data && data.length > 0) {
      return Object.keys(data[0]).map(key => ({ label: key, dataKey: key }));
    }
    return [];
  }

  return columns.map((col, index) => {
    if (typeof col === 'string') {
      return { label: col, dataKey: col };
    } else if (col && typeof col === 'object') {
      const dataKey = col.dataKey || col.label || `column_${index}`;
      const label = col.label || col.dataKey || `Column ${index + 1}`;
      return { label, dataKey };
    }
    return { label: `Column ${index + 1}`, dataKey: `column_${index}` };
  });
}

export const Table: React.FC<TableProps> = ({ data, config }) => {
  if (!data || data.length === 0) return null;

  const normalizedColumns = normalizeColumns(config.columns, data);

  return (
    <div className="w-full h-full">
      {config.title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{config.title}</h3>
      )}
      <div className="overflow-auto" style={{ maxHeight: '500px' }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {normalizedColumns.map((col, idx) => (
                <th
                  key={`header-${col.dataKey}-${idx}`}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((row, rowIdx) => (
              <tr key={`row-${rowIdx}`} className="hover:bg-gray-50 transition-colors">
                {normalizedColumns.map((col, colIdx) => (
                  <td 
                    key={`cell-${rowIdx}-${col.dataKey}-${colIdx}`} 
                    className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap"
                  >
                    {row[col.dataKey] !== null && row[col.dataKey] !== undefined 
                      ? String(row[col.dataKey]) 
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
