/**
 * ScreensFooterCards.jsx
 * Yodeck-style footer cards for the Screens page.
 * Shows "Get free Players", "Purchase a Player", and "Connect your own" options.
 */

import { Monitor, Smartphone, Tv, Settings, Tablet, ExternalLink } from 'lucide-react';
import { Button } from '../../design-system';

/**
 * Device icon component for the Connect Your Own card
 */
function DeviceIcon({ icon: Icon, title }) {
  return (
    <div
      className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
      title={title}
    >
      <Icon className="w-4 h-4 text-gray-500" />
    </div>
  );
}

/**
 * ScreensFooterCards - Footer section with player options
 *
 * @param {Object} props
 * @param {() => void} [props.onUpgrade] - Callback when upgrade is clicked
 * @param {() => void} [props.onBuyPlayer] - Callback when buy player is clicked
 * @param {() => void} [props.onAddScreen] - Callback when add screen is clicked
 * @param {string} [props.className] - Additional CSS classes
 */
export function ScreensFooterCards({
  onUpgrade,
  onBuyPlayer,
  onAddScreen,
  className = '',
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-200 ${className}`}>
      {/* Get Free Players */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-orange-50 rounded-full opacity-50" />

        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-medium text-gray-900">Get free Players</h3>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                RECOMMENDED
              </span>
            </div>
            {/* Player device illustration */}
            <div className="w-16 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center shadow-md">
              <div className="w-12 h-8 bg-gray-600 rounded flex items-center justify-center">
                <Monitor className="w-6 h-6 text-gray-300" />
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Get all BizScreen Players for <strong className="text-gray-700">free</strong>, by subscribing to an Annual Plan.
          </p>

          <Button variant="secondary" size="sm" onClick={onUpgrade}>
            Upgrade Now
          </Button>
        </div>
      </div>

      {/* Purchase a Player */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-900 mb-3">Purchase a Player</h3>

        <p className="text-sm text-gray-500 mb-4">
          Buy a BizScreen Player for <strong className="text-gray-700">$79</strong> and use BizScreen for free with 1 screen.
        </p>

        <Button variant="secondary" size="sm" onClick={onBuyPlayer}>
          Buy a Player
          <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* Connect Your Own */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-900 mb-3">Connect your own Players</h3>

        <p className="text-sm text-gray-500 mb-4">
          Use your own Players with BizScreen. Select "Add Screen" to connect a new Player.
        </p>

        {/* Device icons row */}
        <div className="flex items-center gap-2 mb-4">
          <DeviceIcon icon={Settings} title="Raspberry Pi" />
          <DeviceIcon icon={Smartphone} title="Android" />
          <DeviceIcon icon={Tv} title="Fire TV" />
          <DeviceIcon icon={Monitor} title="Windows" />
          <DeviceIcon icon={Tablet} title="Web Browser" />
        </div>

        <Button variant="ghost" size="sm" onClick={onAddScreen} className="text-[#f26f21] hover:text-[#e05a10]">
          Add Screen →
        </Button>
      </div>
    </div>
  );
}

export default ScreensFooterCards;
