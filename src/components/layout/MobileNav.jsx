/**
 * MobileNav Component
 * Slide-out navigation overlay for mobile/tablet devices.
 * Renders when screen < 1024px (lg breakpoint).
 */
import { Fragment } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export function MobileNav({
  open,
  onClose,
  navigation,
  currentPage,
  setCurrentPage,
  mediaExpanded,
  setMediaExpanded,
  branding,
  topOffset = 0,
}) {
  // Lock body scroll when open
  useBodyScrollLock(open);

  const handleNavClick = (itemId) => {
    setCurrentPage(itemId);
    onClose();
  };

  if (!open) return null;

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        style={{ top: topOffset }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <aside
        className="fixed left-0 bottom-0 w-[280px] bg-white shadow-xl z-50 overflow-y-auto"
        style={{ top: topOffset }}
        role="navigation"
        aria-label="Mobile navigation"
      >
        {/* Header with close */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.businessName}
                className="h-8 object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: '#f26f21' }}
                >
                  {(branding?.businessName || 'B')[0].toUpperCase()}
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {branding?.businessName}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id ||
              (item.subItems && item.subItems.some(sub => sub.id === currentPage));
            const isExpanded = item.expandable && mediaExpanded;

            if (item.expandable) {
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setMediaExpanded(!mediaExpanded)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors min-h-[44px] ${
                      isActive
                        ? 'text-[#f26f21] bg-[#fff5f0] font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={isActive ? '' : 'text-gray-400'} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-100 pl-3">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = currentPage === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => handleNavClick(subItem.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${
                              isSubActive
                                ? 'text-[#f26f21] bg-[#fff5f0] font-medium'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <SubIcon size={18} className={isSubActive ? '' : 'text-gray-400'} />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[44px] ${
                  isActive
                    ? 'text-[#f26f21] bg-[#fff5f0] font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} className={isActive ? '' : 'text-gray-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </Fragment>
  );
}

export default MobileNav;
