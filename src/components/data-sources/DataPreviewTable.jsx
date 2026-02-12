/**
 * @file DataPreviewTable.jsx
 * @description Admin-side scrollable preview table that displays all fields and rows from a data source.
 * Used after connecting a Google Sheets URL or uploading CSV so user can confirm data looks right.
 *
 * Props:
 * - fields: array of field objects with { name, label, dataType }
 * - rows: array of row objects with { values: { [fieldName]: value } }
 * - visibleColumns: optional array of field names to show (null = all visible)
 * - columnOrder: optional array of field names for display order (null = source order)
 * - maxHeight: optional string for container max height (default '400px')
 */

/**
 * DataPreviewTable - Renders a scrollable table with sticky headers, alternating rows, and row count.
 */
export function DataPreviewTable({
  fields = [],
  rows = [],
  visibleColumns = null,
  columnOrder = null,
  maxHeight = '400px',
}) {
  // Compute displayed fields: use columnOrder (or source order), filtered by visibleColumns
  const orderedNames = columnOrder || fields.map((f) => f.name);
  const fieldMap = new Map(fields.map((f) => [f.name, f]));

  const displayedFields = orderedNames
    .filter((name) => {
      // If visibleColumns is null, show all; otherwise only show visible ones
      if (visibleColumns !== null && !visibleColumns.includes(name)) return false;
      // Ensure the field actually exists
      return fieldMap.has(name);
    })
    .map((name) => fieldMap.get(name));

  // Empty state
  if (displayedFields.length === 0 || rows.length === 0) {
    return (
      <div className="border border-gray-700 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="overflow-auto border border-gray-700 rounded-lg"
        style={{ maxHeight }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr>
              {displayedFields.map((field) => (
                <th
                  key={field.name}
                  className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left"
                >
                  {field.label || field.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={`${
                  rowIndex % 2 === 0 ? 'bg-gray-900/50' : 'bg-transparent'
                } hover:bg-gray-800/50`}
              >
                {displayedFields.map((field) => (
                  <td
                    key={field.name}
                    className="px-3 py-2 text-gray-300 border-b border-gray-800"
                  >
                    {row.values?.[field.name] ?? '\u2014'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {rows.length} row{rows.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
