/**
 * Translation Filters Component
 *
 * Provides filter controls for the translation dashboard.
 * Filters by translation status (draft/review/approved) and language code.
 */

import React from 'react';
import { Select } from '../../design-system';
import { getSupportedLanguages } from '../../services/languageService';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
];

export default function TranslationFilters({ filters, onChange }) {
  const languages = getSupportedLanguages();

  return (
    <div className="flex gap-4 items-end">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <Select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          options={STATUS_OPTIONS}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Language
        </label>
        <Select
          value={filters.languageCode}
          onChange={(e) => onChange({ ...filters, languageCode: e.target.value })}
          options={[
            { value: '', label: 'All Languages' },
            ...languages.map(l => ({ value: l.code, label: l.name }))
          ]}
        />
      </div>
    </div>
  );
}
