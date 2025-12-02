export default function Layout1({ layout = {}, guest = null }) {
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
    showHoursOfOperation,
    hoursOfOperationFrom,
    hoursOfOperationTo,
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
    <div className="w-full h-full relative text-white overflow-hidden">
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
              : 'url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=3840)',
          }}
        />
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/55" />

      {/* Top Left - Logo */}
      {showLogo && (
        <div className="absolute top-8 left-10 z-10">
          {logo ? (
            <img src={logo} alt="Logo" className="h-16 w-auto drop-shadow-lg" />
          ) : (
            <div className="bg-white/95 px-6 py-3 rounded-lg text-black text-lg font-bold shadow-xl">
              {propertyName || 'logo'}
            </div>
          )}
        </div>
      )}

      {/* Top Center - Check-in/Check-out */}
      {showCheckInOut && standardCheckInTime && standardCheckOutTime && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/60 backdrop-blur-lg rounded-full px-10 py-4 flex items-center gap-6 text-lg border border-white/30 shadow-2xl">
            <div>
              <span className="font-bold">From:</span> <span className="font-semibold">{formatTime(standardCheckInTime)}</span>
            </div>
            <div className="text-white/60 text-2xl">|</div>
            <div>
              <span className="font-bold">To:</span> <span className="font-semibold">{formatTime(standardCheckOutTime)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Right - Time, Temperature, Date, Weather */}
      <div className="absolute top-8 right-10 z-10 text-right">
        <div className="flex items-baseline gap-6 justify-end mb-2">
          <div className="text-8xl font-bold drop-shadow-2xl tracking-tight">{timeStr}</div>
          {showWeather && weatherTemp && (
            <div className="text-8xl font-bold drop-shadow-2xl tracking-tight">{weatherTemp}</div>
          )}
        </div>
        <div className="text-3xl font-semibold drop-shadow-lg">{dateStr}</div>
        {showWeather && weatherCity && (
          <div className="text-xl text-white/95 drop-shadow-md mt-2 font-medium">
            {weatherCity}
            {weatherDescription && ` • ${weatherDescription}`}
          </div>
        )}
      </div>

      {/* Left Side - Welcome Message and Info */}
      <div className="absolute left-10 top-32 bottom-40 flex flex-col justify-center max-w-3xl z-10">
        {showWelcomeMessage && (
          <div className="mb-10">
            <h1 className="text-7xl font-bold mb-6 leading-tight drop-shadow-2xl break-words">
              {welcomeGreeting}
            </h1>
            <p className="text-3xl leading-relaxed text-white/95 drop-shadow-lg font-light break-words whitespace-normal">
              {welcomeMessage ||
                "Thank you for visiting. We hope you enjoy your experience with us today."}
            </p>
          </div>
        )}

        {/* WiFi Info */}
        {showWifi && wifiNetwork && wifiPassword && (
          <div className="flex items-center gap-4 mb-5">
            <span className="text-4xl">📶</span>
            <div>
              <div className="font-bold text-2xl">@ {wifiNetwork}</div>
              <div className="text-xl text-white/90 font-medium">*** {wifiPassword}</div>
            </div>
          </div>
        )}

        {/* Contact Phone */}
        {showContact && contactPhone && (
          <div className="flex items-center gap-4 mb-5">
            <span className="text-4xl">📞</span>
            <div className="text-2xl font-semibold">{contactPhone}</div>
          </div>
        )}

        {/* Contact Email */}
        {showContact && contactEmail && (
          <div className="flex items-center gap-4 mb-5">
            <span className="text-4xl">✉️</span>
            <div className="text-2xl font-semibold">{contactEmail}</div>
          </div>
        )}

        {/* Hours of Operation */}
        {showHoursOfOperation && hoursOfOperationFrom && hoursOfOperationTo && (
          <div className="flex items-center gap-4">
            <span className="text-4xl">🕐</span>
            <div className="text-2xl font-semibold">{hoursOfOperationFrom} - {hoursOfOperationTo}</div>
          </div>
        )}
      </div>

      {/* Bottom Left - QR Codes */}
      {showQRCodes && qrCodes.length > 0 && (
        <div className="absolute bottom-10 left-10 flex gap-8 z-10">
          {qrCodes.slice(0, 2).map((qr, idx) => (
            <div key={idx} className="text-center">
              <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden mb-3 shadow-2xl">
                {qr.details && (qr.details.startsWith('data:image') || qr.details.startsWith('http')) ? (
                  <img
                    src={qr.details}
                    alt={qr.name || "QR Code"}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="text-black text-base font-bold">QR</div>
                )}
              </div>
              <div className="text-xl font-bold drop-shadow-lg">{qr.name || "QR Code"}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Right - Footer */}
      <div className="absolute bottom-10 right-10 z-10 text-right text-base text-white/90">
        <div className="flex items-center gap-2 justify-end font-medium">
          <span>Powered by</span>
          <span className="font-bold">BizScreen</span>
        </div>
      </div>
    </div>
  );
}
