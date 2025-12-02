import { useState, useEffect } from 'react';

export default function Layout4({ layout, guest }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const {
    showWelcomeMessage,
    welcomeGreeting = "Welcome",
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
    carouselImages,
  } = layout;

  // Dynamic font size for welcome message based on text length
  const getMessageFontSize = (text) => {
    if (!text) return 'text-2xl';
    const length = text.length;
    if (length <= 150) return 'text-3xl';
    if (length <= 250) return 'text-2xl';
    if (length <= 400) return 'text-xl';
    if (length <= 600) return 'text-lg';
    return 'text-base';
  };

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
  const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  const monthDay = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(now);

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

      {/* Top left - Date, Time, Temperature, Check Out */}
      <div className="absolute top-8 left-10 z-10 flex items-start gap-8 text-lg">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{dayOfWeek}, {monthDay}</span>
        </div>
        <div className="text-white/60">|</div>
        <div className="font-semibold">{timeStr}</div>
        <div className="text-white/60">|</div>
        {showWeather && weatherTemp && (
          <>
            <div className="font-semibold">{weatherTemp}</div>
            <div className="text-white/60">|</div>
          </>
        )}
        {showCheckInOut && standardCheckOutTime && (
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
            </svg>
            <span className="font-semibold">Check Out</span>
            <span className="text-base">{monthDay}</span>
          </div>
        )}
      </div>

      {/* Left side panel - Welcome message */}
      <div className="absolute left-10 top-32 bottom-72 w-5/12 z-10 flex flex-col justify-center">
        {showWelcomeMessage && (
          <div>
            <h1 className="text-7xl font-bold mb-8 leading-tight break-words">
              {welcomeGreeting}
            </h1>
            <p className={`${getMessageFontSize(welcomeMessage)} leading-relaxed text-white/90 break-words whitespace-normal`}>
              {welcomeMessage ||
                "Thank you for visiting. We hope you enjoy your experience with us today."}
            </p>
          </div>
        )}
      </div>

      {/* Carousel dots - centered at bottom above bar */}
      {!backgroundVideo && images.length > 1 && (
        <div className="absolute bottom-60 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === activeImageIndex ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Bottom Bar - Dark panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 z-10 px-10 py-8">
        <div className="flex items-center justify-between">
          {/* Left - Logo */}
          <div className="flex items-center gap-12">
            {showLogo && (
              <div className="flex items-center">
                {logo ? (
                  <img src={logo} alt="Logo" className="h-16 w-auto" />
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="w-16 h-16 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 3.6v7.72c0 4.48-3.05 8.69-7 9.93V4.18z"/>
                      <path d="M7 10.5l-2 2 5 5 9-9-2-2-7 7z"/>
                    </svg>
                    <div className="text-blue-400 text-base font-bold uppercase tracking-wide">
                      {propertyName || 'Aloha Ventures'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QR Codes section */}
            {showQRCodes && qrCodes.length > 0 && (
              <div className="flex items-center gap-8">
                {qrCodes.slice(0, 3).map((qr, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="text-sm font-semibold text-white/70">{qr.name || "QR Code"}</div>
                    <div className="w-20 h-20 bg-white rounded flex items-center justify-center overflow-hidden">
                      {qr.details && (qr.details.startsWith('data:image') || qr.details.startsWith('http')) ? (
                        <img
                          src={qr.details}
                          alt={qr.name || 'QR Code'}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Center - WiFi and Contact */}
          <div className="flex items-center gap-8 text-base">
            {showWifi && wifiNetwork && wifiPassword && (
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM2.707 7.293a1 1 0 00-1.414 1.414A9.962 9.962 0 0110 12a9.962 9.962 0 018.707-3.293 1 1 0 00-1.414-1.414A7.968 7.968 0 0010 10a7.968 7.968 0 00-7.293-2.707z"/>
                </svg>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{wifiNetwork}</span>
                  <span className="text-white/60">{wifiPassword}</span>
                </div>
              </div>
            )}
            {showContact && contactPhone && (
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                <span>{contactPhone}</span>
              </div>
            )}
            {showContact && contactEmail && (
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <span className="text-sm">{contactEmail}</span>
              </div>
            )}
          </div>

          {/* Right - Weather */}
          {showWeather && weatherTemp && (
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
              </svg>
              <div className="text-right">
                <div className="text-4xl font-bold leading-none">{weatherTemp}</div>
                {weatherDescription && (
                  <div className="text-sm text-white/70 mt-0.5">{weatherDescription}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-2 right-10 z-20 text-xs text-white/40 flex items-center gap-1">
        <span>Powered by BizScreen</span>
      </div>
    </div>
  );
}
