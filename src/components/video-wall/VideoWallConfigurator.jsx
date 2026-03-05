/**
 * VideoWallConfigurator - Grid editor for video wall screen assignment
 *
 * Renders a visual rows x cols grid where each cell can have a screen (tv_device)
 * assigned to it. One screen must be designated as leader for sync purposes.
 *
 * @param {Object} props
 * @param {Object} props.wall - Video wall object with rows, cols
 * @param {Array} props.screens - Available tv_devices for assignment
 * @param {Array} props.wallScreens - Current wall_screen assignments
 * @param {Function} props.onSave - Save callback with updated assignments
 * @param {Function} props.onClose - Close callback
 */

import { useState, useMemo } from 'react';
import { Star, X, Monitor, Save, Loader2 } from 'lucide-react';
import { Button } from '../../design-system';

export default function VideoWallConfigurator({ wall, screens, wallScreens, onSave, onClose }) {
  // Build initial assignments map: `${row}-${col}` -> { screenId, screenName, isLeader }
  const initialAssignments = useMemo(() => {
    const map = {};
    (wallScreens || []).forEach((ws) => {
      const key = `${ws.row_position}-${ws.col_position}`;
      const device = screens.find((s) => s.id === ws.screen_id);
      map[key] = {
        screenId: ws.screen_id,
        screenName: device?.device_name || 'Unknown',
        isLeader: ws.is_leader || false,
      };
    });
    return map;
  }, [wallScreens, screens]);

  const [assignments, setAssignments] = useState(initialAssignments);
  const [pickerCell, setPickerCell] = useState(null); // { row, col } for open picker
  const [saving, setSaving] = useState(false);

  // Screens already assigned to this wall
  const assignedScreenIds = useMemo(
    () => new Set(Object.values(assignments).map((a) => a.screenId)),
    [assignments]
  );

  // Available screens for picker (not yet assigned)
  const availableScreens = useMemo(
    () => screens.filter((s) => !assignedScreenIds.has(s.id)),
    [screens, assignedScreenIds]
  );

  const handleAssignScreen = (row, col, screen) => {
    const key = `${row}-${col}`;
    const hasLeader = Object.values(assignments).some((a) => a.isLeader);
    setAssignments((prev) => ({
      ...prev,
      [key]: {
        screenId: screen.id,
        screenName: screen.device_name,
        isLeader: !hasLeader, // First assigned screen becomes leader by default
      },
    }));
    setPickerCell(null);
  };

  const handleRemoveScreen = (row, col) => {
    const key = `${row}-${col}`;
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[key];
      // If removed screen was leader, promote first remaining
      const remaining = Object.entries(next);
      if (remaining.length > 0 && !remaining.some(([, a]) => a.isLeader)) {
        const [firstKey] = remaining[0];
        next[firstKey] = { ...next[firstKey], isLeader: true };
      }
      return next;
    });
  };

  const handleToggleLeader = (row, col) => {
    const key = `${row}-${col}`;
    setAssignments((prev) => {
      const next = {};
      // Set all to non-leader, then toggle target
      Object.entries(prev).forEach(([k, a]) => {
        next[k] = { ...a, isLeader: k === key };
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert assignments map to array for DB upsert
      const wallScreensData = Object.entries(assignments).map(([key, a]) => {
        const [row, col] = key.split('-').map(Number);
        return {
          wall_id: wall.id,
          screen_id: a.screenId,
          row_position: row,
          col_position: col,
          is_leader: a.isLeader,
        };
      });
      await onSave(wallScreensData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configure Wall: {wall.name}</h2>
            <p className="text-sm text-gray-500">
              {wall.rows} rows x {wall.cols} cols - Assign screens to positions
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Grid */}
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>= Leader screen (broadcasts sync)</span>
          </div>

          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${wall.cols}, 1fr)`,
              gridTemplateRows: `repeat(${wall.rows}, 1fr)`,
            }}
          >
            {Array.from({ length: wall.rows }, (_, row) =>
              Array.from({ length: wall.cols }, (_, col) => {
                const key = `${row}-${col}`;
                const assignment = assignments[key];
                const isPickerOpen = pickerCell?.row === row && pickerCell?.col === col;

                return (
                  <div
                    key={key}
                    className={`relative min-h-[100px] rounded-lg border-2 flex flex-col items-center justify-center p-3 transition-colors ${
                      assignment
                        ? assignment.isLeader
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-blue-300 bg-blue-50'
                        : 'border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!assignment && !isPickerOpen) {
                        setPickerCell({ row, col });
                      }
                    }}
                  >
                    {assignment ? (
                      <>
                        <Monitor className="w-6 h-6 text-gray-600 mb-1" />
                        <span className="text-xs font-medium text-gray-700 text-center truncate max-w-full">
                          {assignment.screenName}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          R{row} C{col}
                        </span>
                        {/* Actions */}
                        <div className="absolute top-1 right-1 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLeader(row, col);
                            }}
                            className={`p-1 rounded ${
                              assignment.isLeader
                                ? 'text-amber-500'
                                : 'text-gray-300 hover:text-amber-400'
                            }`}
                            title={assignment.isLeader ? 'Leader' : 'Set as leader'}
                          >
                            <Star
                              className={`w-4 h-4 ${assignment.isLeader ? 'fill-amber-500' : ''}`}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveScreen(row, col);
                            }}
                            className="p-1 text-gray-300 hover:text-red-500 rounded"
                            title="Remove screen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-400">Empty</span>
                        <span className="text-[10px] text-gray-300">
                          R{row} C{col}
                        </span>
                      </>
                    )}

                    {/* Screen picker dropdown */}
                    {isPickerOpen && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border z-10 max-h-48 overflow-auto">
                        <div className="p-2 border-b">
                          <span className="text-xs font-medium text-gray-500">Select Screen</span>
                        </div>
                        {availableScreens.length === 0 ? (
                          <div className="p-3 text-sm text-gray-400 text-center">
                            No available screens
                          </div>
                        ) : (
                          availableScreens.map((screen) => (
                            <button
                              key={screen.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignScreen(row, col, screen);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Monitor className="w-4 h-4 text-gray-400" />
                              {screen.device_name}
                            </button>
                          ))
                        )}
                        <div className="p-2 border-t">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPickerCell(null);
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <span className="text-sm text-gray-500">
            {Object.keys(assignments).length} of {wall.rows * wall.cols} positions assigned
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save Layout
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
