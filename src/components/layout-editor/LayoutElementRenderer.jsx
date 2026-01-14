/**
 * LayoutElementRenderer
 *
 * Renders layout elements based on their type.
 * Supports: text, image, widget (clock, date, weather, qr, data)
 */

import { Clock, Calendar, CloudSun, QrCode, Image, Database } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function LayoutElementRenderer({ element }) {
  const { type, props = {} } = element;

  switch (type) {
    case 'text':
      return <TextElement props={props} />;
    case 'image':
      return <ImageElement props={props} />;
    case 'widget':
      return <WidgetElement element={element} />;
    default:
      return (
        <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
          <span className="text-xs text-gray-400">Unknown</span>
        </div>
      );
  }
}

function TextElement({ props }) {
  const {
    text = 'Text',
    fontSize = 32,
    fontFamily = 'Inter',
    fontWeight = 'normal',
    align = 'left',
    color = '#ffffff',
    backgroundColor,
  } = props;

  const alignMap = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };

  return (
    <div
      className="w-full h-full flex items-center overflow-hidden px-2"
      style={{
        justifyContent: alignMap[align],
        fontSize: `${fontSize}px`,
        fontFamily,
        fontWeight,
        color,
        backgroundColor: backgroundColor || 'transparent',
        textAlign: align,
      }}
    >
      {text}
    </div>
  );
}

function ImageElement({ props }) {
  const { url, fit = 'cover', borderRadius = 0, opacity = 1 } = props;

  if (!url) {
    return (
      <div
        className="w-full h-full bg-gray-800 flex items-center justify-center"
        style={{ borderRadius: `${borderRadius}px`, opacity }}
      >
        <Image className="w-8 h-8 text-gray-600" />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden" style={{ borderRadius: `${borderRadius}px`, opacity }}>
      <img src={url} alt="" className="w-full h-full" style={{ objectFit: fit }} draggable={false} />
    </div>
  );
}

function WidgetElement({ element }) {
  const { widgetType = 'clock', props = {} } = element;

  switch (widgetType) {
    case 'clock':
      return <ClockWidget props={props} />;
    case 'date':
      return <DateWidget props={props} />;
    case 'weather':
      return <WeatherWidget props={props} />;
    case 'qr':
      return <QRWidget props={props} />;
    case 'data':
      return <DataWidget props={props} />;
    default:
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-800/50 rounded-lg border border-gray-600">
          <span className="text-xs text-gray-400 uppercase">{widgetType}</span>
        </div>
      );
  }
}

function ClockWidget({ props }) {
  const { textColor = '#ffffff', format = '12h', showSeconds = false } = props;

  const now = new Date();
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds && { second: '2-digit' }),
    hour12: format === '12h',
  };

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ color: textColor }}>
      <span className="text-2xl font-light">{now.toLocaleTimeString('en-US', timeOptions)}</span>
    </div>
  );
}

function DateWidget({ props }) {
  const { textColor = '#ffffff', format = 'short' } = props;

  const now = new Date();
  const formatOptions = {
    short: { weekday: 'short', month: 'short', day: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ color: textColor }}>
      <span className="text-lg">{now.toLocaleDateString('en-US', formatOptions[format] || formatOptions.short)}</span>
    </div>
  );
}

function WeatherWidget({ props }) {
  const { textColor = '#ffffff', location = 'Miami, FL', units = 'imperial', style = 'minimal' } = props;

  // Mock temperature for preview
  const mockTemp = units === 'metric' ? '22°C' : '72°F';

  if (style === 'card') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center rounded-lg p-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <CloudSun className="w-6 h-6 mb-1 text-yellow-400" />
        <span className="text-xl font-semibold" style={{ color: textColor }}>
          {mockTemp}
        </span>
        <span className="text-xs opacity-70" style={{ color: textColor }}>
          {location}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center gap-2">
      <CloudSun className="w-5 h-5 text-yellow-400" />
      <div className="flex flex-col">
        <span className="text-lg font-semibold leading-tight" style={{ color: textColor }}>
          {mockTemp}
        </span>
        <span className="text-xs opacity-70 leading-tight" style={{ color: textColor }}>
          {location}
        </span>
      </div>
    </div>
  );
}

function QRWidget({ props }) {
  const { url = '', label = '', fgColor = '#000000', bgColor = '#ffffff', cornerRadius = 8 } = props;

  // Placeholder pattern for empty URL
  const QRPlaceholder = () => (
    <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-0.5 p-1">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24].map((i) => (
        <div key={i} style={{ background: fgColor, borderRadius: '1px' }} />
      ))}
      {[9, 11, 12, 13, 23].map((i) => (
        <div key={i} style={{ background: fgColor, opacity: 0.4, borderRadius: '1px' }} />
      ))}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-1">
      <div
        className="flex-1 w-full flex items-center justify-center overflow-hidden"
        style={{
          maxWidth: '85%',
          aspectRatio: '1',
          backgroundColor: bgColor,
          borderRadius: `${cornerRadius}px`,
          padding: '4px',
        }}
      >
        {url ? (
          <QRCodeSVG
            value={url}
            size={128}
            level="M"
            fgColor={fgColor}
            bgColor={bgColor}
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        ) : (
          <QRPlaceholder />
        )}
      </div>
      {label && (
        <span className="mt-1 text-xs text-center truncate w-full text-white opacity-80">
          {label}
        </span>
      )}
    </div>
  );
}

function DataWidget({ props }) {
  const { textColor = '#ffffff', fontSize = 24, field = 'value', dataSourceId } = props;

  // Show placeholder in editor
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <span style={{ color: textColor, fontSize: `${fontSize}px` }}>
        {`{{${field}}}`}
      </span>
      <div className="absolute top-1 right-1" title="Data-bound widget">
        <Database className="w-3 h-3 text-blue-400" />
      </div>
    </div>
  );
}
