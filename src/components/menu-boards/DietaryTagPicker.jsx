/**
 * DietaryTagPicker - Tag selection grid for dietary/allergen badges
 *
 * Renders DIETARY_TAGS from menuBoardService as toggleable buttons.
 * Selected tags have solid background with tag color; unselected are outlined.
 *
 * @param {Object} props
 * @param {string[]} props.selectedTags - Currently selected tag keys
 * @param {Function} props.onChange - Callback with updated tag array
 */

import { DIETARY_TAGS } from '../../services/menuBoardService';

export default function DietaryTagPicker({ selectedTags = [], onChange }) {
  const handleToggle = (tagKey) => {
    const isSelected = selectedTags.includes(tagKey);
    const updated = isSelected
      ? selectedTags.filter((k) => k !== tagKey)
      : [...selectedTags, tagKey];
    onChange(updated);
  };

  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {DIETARY_TAGS.map((tag) => {
        const isSelected = selectedTags.includes(tag.key);
        return (
          <button
            key={tag.key}
            type="button"
            onClick={() => handleToggle(tag.key)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors"
            style={
              isSelected
                ? { backgroundColor: tag.color, color: '#fff' }
                : { border: '1px solid #d1d5db', color: '#6b7280' }
            }
            title={tag.label}
          >
            <span className="font-bold">{tag.emoji}</span>
            <span>{tag.label}</span>
          </button>
        );
      })}
    </div>
  );
}
