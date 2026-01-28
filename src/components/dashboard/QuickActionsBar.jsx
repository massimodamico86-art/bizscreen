/**
 * QuickActionsBar Component
 * Quick action buttons for dashboard header area.
 */
import { Plus, Upload, BarChart3 } from 'lucide-react';
import { Button } from '../../design-system';

export function QuickActionsBar({ onNavigate }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => onNavigate?.('screens')}
      >
        <span className="hidden sm:inline">Add Screen</span>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={<Upload className="w-4 h-4" />}
        onClick={() => onNavigate?.('media-all')}
      >
        <span className="hidden sm:inline">Upload</span>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={<BarChart3 className="w-4 h-4" />}
        onClick={() => onNavigate?.('analytics')}
      >
        <span className="hidden sm:inline">Analytics</span>
      </Button>
    </div>
  );
}

export default QuickActionsBar;
