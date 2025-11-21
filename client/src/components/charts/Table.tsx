import React from 'react';

interface TableProps {
  data: any[];
  config: {
    columns: string[];
    title?: string;
  };
}

export const Table: React.FC<TableProps> = ({ data, config }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-full">
      {config.title && (
        <h3 className="text-sm font-semibold text-text mb-3">{config.title}</h3>
      )}
      <div className="overflow-auto" style={{ maxHeight: '500px' }}>
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              {config.columns.map((col) => (
                <th
                  key={col}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700 bg-gray-900/50">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                {config.columns.map((col) => (
                  <td key={col} className="px-6 py-4 text-sm text-gray-200 whitespace-nowrap">
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
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
