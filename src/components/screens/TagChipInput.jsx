import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * TagChipInput - Reusable tag chip input with keyboard shortcuts
 *
 * Renders tags as blue chips with remove buttons.
 * Supports Enter/comma to add tags, Backspace to remove last tag.
 * Tags are normalized to lowercase and deduplicated.
 *
 * @param {Object} props
 * @param {string[]} props.tags - Current tags array
 * @param {Function} props.onChange - Callback receiving updated tags array
 * @param {string} props.placeholder - Input placeholder text
 */
export default function TagChipInput({ tags = [], onChange, placeholder = 'Add tag...' }) {
  const [input, setInput] = useState('');

  const addTag = (value) => {
    const normalized = value.trim().toLowerCase();
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized]);
    }
    setInput('');
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === ',' ) {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 border border-gray-300 rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
      {tags.map((tag, index) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="hover:text-blue-900 focus:outline-none"
            aria-label={`Remove tag ${tag}`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
      />
    </div>
  );
}
