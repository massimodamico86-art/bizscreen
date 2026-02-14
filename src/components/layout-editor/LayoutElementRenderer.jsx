import { Image } from 'lucide-react';
import { getWidgetComponent } from '../../widgets/registry.js';

/**
 * LayoutElementRenderer
 *
 * Renders layout elements based on their type.
 * Uses the centralized widget registry for widget rendering.
 */


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

  const WidgetComp = getWidgetComponent(widgetType);

  if (WidgetComp) {
    return <WidgetComp props={props} timezone={element.timezone} />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800/50 rounded-lg border border-gray-600">
      <span className="text-xs text-gray-400 uppercase">{widgetType}</span>
    </div>
  );
}
