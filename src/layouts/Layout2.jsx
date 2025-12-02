export default function Layout2({ layout, guest }) {
  const {
    showWelcomeMessage,
    welcomeGreeting = "Welcome!",
    welcomeMessage,
    showQRCodes,
    qrCodes = [],
    showLogo,
    logo,
    propertyName,
    showCheckInOut,
    standardCheckInTime,
    standardCheckOutTime,
    showWeather,
    weatherTemp,
    weatherCity,
    weatherDescription,
    showWifi,
    wifiNetwork,
    wifiPassword,
    showContact,
    contactPhone,
    contactEmail,
    backgroundImage,
    backgroundVideo,
  } = layout;

  // Helper to format time
  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get current date and time
  const now = new Date();
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(now);
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(now);

  return (
    <div className="w-full h-full relative text-white overflow-hidden bg-black">
      {/* Background Image or Video */}
      {backgroundVideo ? (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={backgroundVideo}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: backgroundImage
              ? `url(${backgroundImage})`
              : 'url(https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=3840)',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/50" />

      {/* Top Left - Logo */}
      {showLogo && (
        <div className="absolute top-6 left-8 z-10">
          {logo ? (
            <img src={logo} alt="Logo" className="h-14 w-auto drop-shadow-lg" />
          ) : (
            <div className="text-white text-xl font-bold drop-shadow-lg flex items-center gap-2">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <span>{propertyName || 'LOGO'}</span>
            </div>
          )}
        </div>
      )}

      {/* Top Center - Check-in/Check-out */}
      {showCheckInOut && standardCheckInTime && standardCheckOutTime && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/50 backdrop-blur-md rounded-lg px-8 py-3 flex items-center gap-6 text-sm border border-white/20">
            <div>
              <span className="text-gray-300">From:</span> <span className="font-semibold ml-2">{formatTime(standardCheckInTime)}</span>
            </div>
            <div className="text-white/40">|</div>
            <div>
              <span className="text-gray-300">To:</span> <span className="font-semibold ml-2">{formatTime(standardCheckOutTime)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Right - Time & Date */}
      <div className="absolute top-6 right-8 z-10 text-right">
        <div className="text-7xl font-bold drop-shadow-2xl mb-1">{timeStr}</div>
        <div className="text-2xl font-medium drop-shadow-lg">{dateStr}</div>
      </div>

      {/* Left Sidebar */}
      <div className="absolute left-8 top-28 bottom-32 w-80 flex flex-col justify-center z-10">
        {showWelcomeMessage && (
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-5 leading-tight drop-shadow-2xl break-words">
              {welcomeGreeting}
            </h1>
            <p className="text-xl leading-relaxed text-white/95 drop-shadow-lg font-light break-words whitespace-normal mb-6">
              {welcomeMessage ||
                "Thank you for visiting. We hope you enjoy your experience with us today."}
            </p>
          </div>
        )}

        {/* WiFi Info */}
        {showWifi && wifiNetwork && wifiPassword && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📶</span>
            <div>
              <div className="font-bold text-lg">@ {wifiNetwork}</div>
              <div className="text-base text-white/90">*** {wifiPassword}</div>
            </div>
          </div>
        )}

        {/* Contact Info */}
        {showContact && contactPhone && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📞</span>
            <div className="text-lg font-semibold">{contactPhone}</div>
          </div>
        )}
        {showContact && contactEmail && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">✉️</span>
            <div className="text-lg font-semibold break-all">{contactEmail}</div>
          </div>
        )}

        {/* QR Codes at bottom of sidebar */}
        {showQRCodes && qrCodes.length > 0 && (
          <div className="flex gap-4 mt-6">
            {qrCodes.slice(0, 2).map((qr, idx) => (
              <div key={idx} className="text-center">
                <div className="w-20 h-20 bg-white rounded flex items-center justify-center overflow-hidden mb-2 shadow-xl">
                  {qr.details && (qr.details.startsWith('data:image') || qr.details.startsWith('http')) ? (
                    <img
                      src={qr.details}
                      alt={qr.name || 'QR Code'}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="text-black text-xs font-bold">QR</div>
                  )}
                </div>
                <div className="text-sm font-semibold">{qr.name || "QR"}</div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Bottom Center - Weather Bar */}
      {showWeather && weatherCity && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/50 backdrop-blur-md rounded-lg px-8 py-4 flex items-center gap-8 border border-white/20">
            <div className="text-center">
              <div className="font-bold text-sm mb-1">{weatherCity}</div>
              {weatherTemp && (
                <div className="text-5xl font-bold">{weatherTemp}</div>
              )}
              {weatherDescription && (
                <div className="text-sm text-gray-300 mt-1">{weatherDescription}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Right - Footer */}
      <div className="absolute bottom-6 right-8 z-10 text-sm text-white/80">
        <div className="flex items-center gap-2">
          <span>Powered By</span>
          <span className="font-bold">BizScreen</span>
        </div>
      </div>
    </div>
  );
}
