/**
 * CreateLayoutModal Component
 *
 * Modal for creating a new layout with orientation selection.
 * Supports creating blank layouts or starting from templates.
 *
 * @example
 * <CreateLayoutModal
 *   open={showModal}
 *   onClose={() => setShowModal(false)}
 *   onCreateBlank={(orientation) => handleCreate(orientation)}
 *   onBrowseTemplates={() => handleBrowseTemplates()}
 * />
 */

import { forwardRef, useState } from 'react';
import {
  Monitor,
  Smartphone,
  Square,
  MonitorPlay,
  Tv2,
} from 'lucide-react';



/**
 * Orientation presets
 */
const ORIENTATION_PRESETS = [
  {
    id: 'landscape-hd',
    name: 'Landscape HD',
    width: 1920,
    height: 1080,
    icon: Monitor,
    description: '1920 x 1080',
    popular: true,
  },
  {
    id: 'portrait-hd',
    name: 'Portrait HD',
    width: 1080,
    height: 1920,
    icon: Smartphone,
    description: '1080 x 1920',
    popular: true,
  },
  {
    id: 'landscape-4k',
    name: 'Landscape 4K',
    width: 3840,
    height: 2160,
    icon: Tv2,
    description: '3840 x 2160',
    popular: false,
  },
  {
    id: 'square',
    name: 'Square',
    width: 1080,
    height: 1080,
    icon: Square,
    description: '1080 x 1080',
    popular: false,
  },
  {
    id: 'ultrawide',
    name: 'Ultrawide',
    width: 2560,
    height: 1080,
    icon: MonitorPlay,
    description: '2560 x 1080',
    popular: false,
  },
];

export const CreateLayoutModal = forwardRef(function CreateLayoutModal(
  {
    open = false,
    onClose,
    onCreateBlank,
    onBrowseTemplates,
    loading = false,
    ...props
  },
  ref
) {
  const [selectedOrientation, setSelectedOrientation] = useState('landscape-hd');

  const handleCreateBlank = () => {
    const preset = ORIENTATION_PRESETS.find((p) => p.id === selectedOrientation);
    onCreateBlank?.(preset);
  };

  const handleBrowseTemplates = () => {
    const preset = ORIENTATION_PRESETS.find((p) => p.id === selectedOrientation);
    onBrowseTemplates?.(preset);
  };

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={onClose}
      size="md"
      {...props}
    >
      <ModalHeader>
        <ModalTitle>Create Layout</ModalTitle>
        <ModalDescription>
          Choose an orientation for your screen layout.
        </ModalDescription>
      </ModalHeader>

      <ModalContent>
        {/* Orientation Grid */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-medium text-gray-700">
            Screen Orientation
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ORIENTATION_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedOrientation === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedOrientation(preset.id)}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all text-left
                    ${isSelected
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Selection checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}

                  {/* Popular badge */}
                  {preset.popular && !isSelected && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-brand-500 text-white text-[10px] font-medium rounded-full">
                      Popular
                    </div>
                  )}

                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center mb-2
                    ${isSelected ? 'bg-brand-100' : 'bg-gray-100'}
                  `}>
                    <Icon
                      size={20}
                      className={isSelected ? 'text-brand-600' : 'text-gray-500'}
                    />
                  </div>
                  <div className="font-medium text-gray-900 text-sm">
                    {preset.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            How would you like to start?
          </label>

          {/* Blank Layout Option */}
          <button
            type="button"
            onClick={handleCreateBlank}
            disabled={loading}
            className="
              w-full p-4 border border-gray-200 rounded-xl
              hover:border-brand-300 hover:bg-brand-50
              transition-all text-left flex items-center gap-4 group
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
              <FileText size={24} className="text-gray-400 group-hover:text-brand-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Blank Layout</h3>
              <p className="text-sm text-gray-500">Start fresh and add zones manually</p>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-brand-600" />
          </button>

          {/* Template Option */}
          <button
            type="button"
            onClick={handleBrowseTemplates}
            disabled={loading}
            className="
              w-full p-4 border-2 border-brand-200 bg-brand-50 rounded-xl
              hover:border-brand-400 hover:bg-brand-100
              transition-all text-left flex items-center gap-4 group
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center group-hover:bg-brand-200 transition-colors">
              <LayoutTemplate size={24} className="text-brand-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                Start from Template
                <span className="px-2 py-0.5 text-xs font-medium bg-brand-500 text-white rounded-full">
                  Recommended
                </span>
              </h3>
              <p className="text-sm text-gray-500">Pre-designed zones ready to customize</p>
            </div>
            <ChevronRight size={20} className="text-brand-600" />
          </button>
        </div>

        {/* Hint */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Design directly in BizScreen - no external account required. Saved layouts go to your library.
        </p>
      </ModalContent>

      <ModalFooter className="justify-start">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
});

export { ORIENTATION_PRESETS };
export default CreateLayoutModal;
