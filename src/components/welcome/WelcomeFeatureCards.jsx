/**
 * WelcomeFeatureCards.jsx
 * Yodeck-style feature cards for playlists, templates, and tutorial.
 */


/**
 * WelcomeFeatureCards - Three feature cards for the welcome section
 *
 * @param {Object} props
 * @param {() => void} [props.onCreatePlaylist] - Callback for playlist creation
 * @param {() => void} [props.onBrowseTemplates] - Callback for browsing templates
 * @param {() => void} [props.onWatchTutorial] - Callback for watching tutorial
 */
export function WelcomeFeatureCards({
  onCreatePlaylist,
  onBrowseTemplates,
  onWatchTutorial,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Playlists Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
        <h3 className="font-medium text-gray-900 mb-1">
          Sequence your content with playlists
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Combine media, apps & layouts into playlists. Display them in any sequence on your screens.
        </p>

        {/* Playlist illustration */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-8 bg-orange-100 rounded flex items-center justify-center">
              <Play className="w-4 h-4 text-[#f26f21]" />
            </div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-[#f26f21] rounded-full" />
            </div>
            <span className="text-xs text-gray-500">4"</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-12 h-8 bg-purple-100 rounded flex items-center justify-center">
              <Layout className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-purple-500 rounded-full" />
            </div>
            <span className="text-xs text-gray-500">8"</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-12 h-8 bg-blue-100 rounded flex items-center justify-center">
              <ListVideo className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-blue-500 rounded-full" />
            </div>
            <span className="text-xs text-gray-500">6"</span>
          </div>
        </div>

        <Button variant="secondary" className="w-full" onClick={onCreatePlaylist}>
          Create Your First Playlist
        </Button>
      </div>

      {/* Templates Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
        <h3 className="font-medium text-gray-900 mb-1">
          Templates to get you started
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Pick from 1000+ of templates and customize them in our layout editor.
        </p>

        {/* Template preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 relative">
          <div className="aspect-video bg-gradient-to-br from-teal-400 to-teal-600 rounded flex items-center justify-center overflow-hidden">
            <div className="text-center text-white p-4">
              <p className="text-sm font-medium">Happy hour</p>
              <p className="text-xl font-bold">50% off</p>
              <p className="text-xs">till 16:00</p>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#f26f21] rounded-full flex items-center justify-center shadow-md">
            <MousePointer className="w-3 h-3 text-white" />
          </div>
        </div>

        <Button variant="secondary" className="w-full" onClick={onBrowseTemplates}>
          Check Out All Templates
        </Button>
      </div>

      {/* Tutorial Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
        <div className="mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">LEARN THE BASICS</span>
          <h3 className="text-lg font-bold text-[#f26f21]">BIZSCREEN 101</h3>
        </div>

        {/* Video thumbnail */}
        <div className="bg-gray-100 rounded-lg aspect-video mb-4 flex items-center justify-center relative overflow-hidden group cursor-pointer" onClick={onWatchTutorial}>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-orange-600/30" />
          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg z-10 group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-white ml-1" fill="white" />
          </div>
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            3:45
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Discover, learn and get the most out of BizScreen.
        </p>

        <button
          onClick={onWatchTutorial}
          className="mt-4 text-sm text-[#f26f21] hover:underline flex items-center gap-1"
        >
          Watch now <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default WelcomeFeatureCards;
