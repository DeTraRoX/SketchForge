// Serializable element schema for collaboration + persistence.

export const ELEMENT_TYPES = {
  FREEHAND: 'freehand',
  RECT: 'rectangle',
  ELLIPSE: 'ellipse',
  DIAMOND: 'diamond',
  TRIANGLE: 'triangle',
  STAR: 'star',
  FRAME: 'frame',
  LINE: 'line',
  ARROW: 'arrow',
  TEXT: 'text',
  IMAGE: 'image',
  GROUP: 'group',
};

export function serializeCanvasState({ elements, settings, revision }) {
  return {
    version: 2,
    elements,
    settings: settings || {},
    revision: revision ?? 0,
    exportedAt: Date.now(),
  };
}

export function deserializeCanvasState(payload) {
  if (!payload) return { version: 2, elements: [], settings: {}, revision: 0 };
  if (!Array.isArray(payload.elements)) return { version: 2, elements: [], settings: {}, revision: 0 };
  return {
    version: payload.version || 2,
    elements: payload.elements,
    settings: payload.settings || {},
    revision: payload.revision ?? 0,
  };
}
