import { useState, useEffect } from 'react';

export default function Layout3({ layout, guest }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const {
    showWelcomeMessage,
    welcomeGreeting = "Welcome!",
    welcomeMessage,
    showQRCodes,
    qrCodes = [],
    showLogo,
    logo,
    propertyName,
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
    carouselImages,
  } = layout;

  // Dynamic font size for welcome greeting based on text length
  const getGreetingFontSize = (text) => {
    if (!text) return 'text-5xl';
    const length = text.length;
    if (length <= 8) return 'text-7xl';
    if (length <= 12) return 'text-6xl';
    if (length <= 18) return 'text-5xl';
    if (length <= 25) return 'text-4xl';
    if (length <= 35) return 'text-3xl';
    if (length <= 45) return 'text-2xl';
    if (length <= 60) return 'text-xl';
    if (length <= 80) return 'text-lg';
    return 'text-base';
  };

  // Dynamic font size for welcome message based on text length
  const getMessageFontSize = (text) => {
    if (!text) return 'text-2xl';
    const length = text.length;
    if (length <= 100) return 'text-3xl';
    if (length <= 150) return 'text-2xl';
    if (length <= 200) return 'text-xl';
    if (length <= 300) return 'text-lg';
    if (length <= 400) return 'text-base';
    return 'text-sm';
  };

  // Get current date and time
  const now = new Date();
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(now);
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(now);

  const images = carouselImages?.length
    ? carouselImages
    : backgroundImage
      ? [backgroundImage]
      : ["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=3840"];

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setActiveImageIndex((prev) => (prev + 1) % images.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [images.length]);

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
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${images[activeImageIndex]})`
          }}
        />
      )}

      {/* Left Sidebar - Dark panel (1/3 of screen width) */}
      <div className="absolute left-0 top-0 bottom-64 w-1/3 bg-gray-900/90 z-10 flex flex-col p-8">
        {/* Logo at top */}
        {showLogo && (
          <div className="mb-8">
            {logo ? (
              <img src={logo} alt="Logo" className="h-12 w-auto" />
            ) : (
              <div className="text-white text-xl font-bold flex items-center gap-2">
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
                <span>{propertyName || 'LOGO'}</span>
              </div>
            )}
          </div>
        )}

        {/* Welcome Message */}
        <div className="flex-1">
          {showWelcomeMessage && (
            <div className="mb-6">
              <h1 className={`${getGreetingFontSize(welcomeGreeting)} font-bold mb-3 leading-tight break-words`}>
                {welcomeGreeting}
              </h1>
              <p className={`${getMessageFontSize(welcomeMessage)} leading-relaxed text-white/85 break-words whitespace-normal`}>
                {welcomeMessage ||
                  "Thank you for visiting. We hope you enjoy your experience with us today."}
              </p>
            </div>
          )}
        </div>

        {/* QR Codes at bottom */}
        {showQRCodes && qrCodes.length > 0 && (
          <div className="flex gap-4">
            {qrCodes.slice(0, 2).map((qr, idx) => (
              <div key={idx} className="text-center">
                <div className="w-20 h-20 bg-white rounded flex items-center justify-center overflow-hidden mb-2">
                  {qr.details && (qr.details.startsWith('data:image') || qr.details.startsWith('http')) ? (
                    <img
                      src={qr.details}
                      alt={qr.name || 'QR Code'}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="text-black text-sm font-bold">QR</div>
                  )}
                </div>
                <div className="text-sm font-semibold">{qr.name || "QR"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Carousel dots - centered at bottom above bar */}
      {!backgroundVideo && images.length > 1 && (
        <div className="absolute bottom-68 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === activeImageIndex ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Bottom Bar - Dark panel (4x bigger = 256px) */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gray-900/90 z-10 flex flex-col justify-between px-12 py-8">
        {/* Top row - Weather on left */}
        <div className="flex items-start">
          {showWeather && weatherTemp && (
            <div className="text-center">
              <div className="text-6xl font-bold leading-none">{weatherTemp}</div>
              {weatherDescription && (
                <div className="text-lg text-white/70 mt-1">{weatherDescription}</div>
              )}
            </div>
          )}
        </div>

        {/* Bottom row - WiFi/Contact/Hours on left, Time & Date on right */}
        <div className="flex items-end justify-between">
          {/* WiFi, Contact, Hours */}
          <div className="flex items-center gap-6 text-xl flex-wrap">
            {showWifi && wifiNetwork && wifiPassword && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-4xl">📶</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">@ {wifiNetwork}</span>
                    <span className="text-white/60">*** {wifiPassword}</span>
                  </div>
                </div>
                <div className="text-white/30 text-2xl">|</div>
              </>
            )}
            {showContact && contactPhone && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-4xl">📞</span>
                  <span>{contactPhone}</span>
                </div>
                <div className="text-white/30 text-2xl">|</div>
              </>
            )}
            {showContact && contactEmail && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-4xl">✉️</span>
                  <span>{contactEmail}</span>
                </div>
                <div className="text-white/30 text-2xl">|</div>
              </>
            )}
            <div className="flex items-center gap-2">
              <span className="text-4xl">🕐</span>
              <span>8 am - 8 pm</span>
            </div>
          </div>

          {/* Time & Date on bottom right */}
          <div className="text-right">
            <div className="text-8xl font-bold leading-none">{timeStr}</div>
            <div className="text-2xl mt-2">{dateStr}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 text-xs text-white/40">
        powered by BizScreen
      </div>
    </div>
  );
}
