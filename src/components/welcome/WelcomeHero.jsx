/**
 * WelcomeHero.jsx
 * Yodeck-style welcome hero section with greeting, add media prompt, and screen preview.
 */


/**
 * WelcomeHero - Main hero section for the welcome/dashboard page
 *
 * @param {Object} props
 * @param {string} props.userName - User's display name
 * @param {() => void} [props.onAddMedia] - Callback when add media is clicked
 */
export function WelcomeHero({ userName = 'there', onAddMedia }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-normal text-gray-900 mb-6">
        Hi, {userName},
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Media Prompt */}
        <button
          onClick={onAddMedia}
          className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center hover:border-[#f26f21] hover:shadow-md transition-all group"
        >
          <div className="relative mb-4">
            {/* Icon cluster */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5 text-[#f26f21]" />
              </div>
              <div className="w-12 h-12 bg-[#f26f21] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Music className="w-5 h-5 text-[#f26f21]" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 justify-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 text-[#f26f21]" />
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Image className="w-5 h-5 text-[#f26f21]" />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Your screen has been created.<br />
            Now, let's add some media!
          </p>
        </button>

        {/* Screen Preview */}
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#f26f21] rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">BS</span>
              </div>
              <span className="text-[#f26f21] font-medium">bizscreen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeHero;
