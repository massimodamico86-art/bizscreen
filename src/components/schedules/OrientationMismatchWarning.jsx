import { AlertTriangle } from 'lucide-react';
import { Alert } from '../../design-system/components/Alert';

/**
 * Warning banner shown when content orientation doesn't match screen orientation.
 * Used in ScheduleEditorPage and EditScreenModal.
 */
export function OrientationMismatchWarning({ contentOrientation, screenOrientation, contentType = 'content' }) {
  if (!contentOrientation || !screenOrientation || contentOrientation === screenOrientation) {
    return null;
  }

  return (
    <Alert variant="warning" className="mt-2">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="flex-shrink-0" />
        <span className="text-sm">
          This {contentType} is designed for <strong>{contentOrientation}</strong> screens,
          but this screen is set to <strong>{screenOrientation}</strong>.
          Content will be rotated automatically but may not look optimal.
        </span>
      </div>
    </Alert>
  );
}
