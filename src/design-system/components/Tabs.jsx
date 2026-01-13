/**
 * Tabs Components
 *
 * Yodeck-inspired tab components for navigation and filtering.
 *
 * @example
 * // Underline tabs (default)
 * <Tabs
 *   tabs={[{ id: 'tab1', label: 'Tab 1' }, { id: 'tab2', label: 'Tab 2' }]}
 *   activeTab="tab1"
 *   onChange={setActiveTab}
 * />
 *
 * // Pill tabs
 * <PillTabs
 *   tabs={[{ id: 'my', label: 'My Items' }, { id: 'discover', label: 'Discover' }]}
 *   activeTab="my"
 *   onChange={setActiveTab}
 * />
 */

import { forwardRef } from 'react';

/**
 * Underline-style tabs (like Yodeck's main navigation tabs)
 */
export const Tabs = forwardRef(function Tabs(
  {
    tabs = [],
    activeTab,
    onChange,
    className = '',
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`border-b border-gray-200 ${className}`}
      {...props}
    >
      <nav className="flex gap-6" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(tab.id)}
              className={`
                py-3 text-sm font-medium border-b-2 transition-colors
                flex items-center gap-2
                ${isActive
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `.trim()}
            >
              {Icon && <Icon size={14} />}
              {tab.label}
              {tab.badge && (
                <span className={`
                  px-1.5 py-0.5 text-xs rounded-full
                  ${isActive ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'}
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
});

/**
 * Pill-style tabs (toggle between options)
 */
export const PillTabs = forwardRef(function PillTabs(
  {
    tabs = [],
    activeTab,
    onChange,
    size = 'md', // 'sm' | 'md'
    className = '',
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
  };

  return (
    <div
      ref={ref}
      className={`inline-flex gap-1 bg-gray-100 p-1 rounded-lg ${className}`}
      role="tablist"
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(tab.id)}
            className={`
              ${sizeClasses[size]}
              rounded-md font-medium transition-all
              flex items-center gap-1.5
              ${isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `.trim()}
          >
            {Icon && <Icon size={size === 'sm' ? 12 : 14} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
});

export default Tabs;
