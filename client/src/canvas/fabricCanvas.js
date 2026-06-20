import * as fabric from 'fabric';
import { ELEMENT_TYPES } from './canvasSchema';

function buildStarPoints(w, h, spikes = 5) {
  const cx = w / 2;
  const cy = h / 2;
  const outer = Math.min(w, h) / 2;
  const inner = outer * 0.4;
  const points = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = i * step - Math.PI / 2;
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return points;
}

export function applyShapeRenderDefaults(obj, strokeWidth = 2) {
  if (!obj) return;
  if (['textbox', 'i-text', 'text', 'image'].includes(obj.type)) return;

  const sw = strokeWidth || obj.strokeWidth || 2;
  const opts = {
    strokeUniform: true,
    strokeLineJoin: 'round',
    strokeLineCap: 'round',
    objectCaching: false,
    padding: Math.max(2, Math.ceil(sw)),
  };
  if (!obj.fill || obj.fill === 'transparent') {
    opts.paintFirst = 'stroke';
  }
  obj.set(opts);

  if (obj.type === 'polygon' || obj.type === 'polyline') {
    obj.set('exactBoundingBox', true);
    if (typeof obj.setDimensions === 'function') obj.setDimensions();
  }
  obj.setCoords();
}

function applyCommonStyles(obj, el) {
  obj.set({
    left: el.x ?? 0,
    top: el.y ?? 0,
    angle: el.rotation || 0,
    opacity: el.opacity ?? 1,
    stroke: el.stroke ?? '#1e1e1e',
    strokeWidth: el.strokeWidth ?? 2,
    fill: el.fill ?? 'transparent',
  });
  if (el.dash?.length) obj.set({ strokeDashArray: el.dash });
  applyShapeRenderDefaults(obj, el.strokeWidth);
}

function createArrowGroup(el) {
  const start = el.start || { x: 0, y: 0 };
  const end = el.end || { x: 100, y: 0 };
  const line = new fabric.Line([start.x, start.y, end.x, end.y], {
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    selectable: false,
    evented: false,
    originX: 'left',
    originY: 'top',
    strokeDashArray: el.dash?.length ? el.dash : null,
  });
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const size = 12 + (el.strokeWidth || 2) * 2;
  const head = new fabric.Triangle({
    left: end.x,
    top: end.y,
    width: size,
    height: size,
    angle: (angle * 180) / Math.PI + 90,
    fill: el.stroke,
    opacity: el.opacity ?? 1,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });
  const group = new fabric.Group([line, head], { selectable: true, evented: true });
  group.set({
    id: el.id,
    sfType: ELEMENT_TYPES.ARROW,
    opacity: el.opacity ?? 1,
    startElementId: el.startElementId || null,
    endElementId: el.endElementId || null,
  });
  return group;
}

export function elementToFabric(el) {
  if (!el?.type) return null;

  switch (el.type) {
    case ELEMENT_TYPES.FREEHAND: {
      if (el.pathData) {
        try {
          const path = new fabric.Path(el.pathData, {
            fill: 'transparent',
            stroke: el.stroke,
            strokeWidth: el.strokeWidth,
            selectable: true,
            evented: true,
            opacity: el.opacity ?? 1,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            strokeDashArray: el.dash?.length ? el.dash : null,
          });
          path.set({
            id: el.id,
            sfType: ELEMENT_TYPES.FREEHAND,
            left: el.x ?? 0,
            top: el.y ?? 0,
            angle: el.rotation || 0,
            scaleX: el.scaleX ?? 1,
            scaleY: el.scaleY ?? 1,
          });
          return path;
        } catch {
          return null;
        }
      }
      if (el.points?.length) {
        const poly = new fabric.Polyline(el.points, {
          fill: 'transparent',
          stroke: el.stroke,
          strokeWidth: el.strokeWidth,
          selectable: true,
          evented: true,
          opacity: el.opacity ?? 1,
          strokeDashArray: el.dash?.length ? el.dash : null,
        });
        poly.set({ id: el.id, sfType: ELEMENT_TYPES.FREEHAND });
        applyCommonStyles(poly, el);
        return poly;
      }
      return null;
    }

    case ELEMENT_TYPES.RECT: {
      const r = new fabric.Rect({
        width: el.width || 120,
        height: el.height || 80,
        rx: el.rounded ? 12 : 0,
        ry: el.rounded ? 12 : 0,
      });
      r.set({ id: el.id, sfType: ELEMENT_TYPES.RECT });
      applyCommonStyles(r, el);
      return r;
    }

    case ELEMENT_TYPES.ELLIPSE: {
      const e = new fabric.Ellipse({
        rx: (el.width || 120) / 2,
        ry: (el.height || 80) / 2,
      });
      e.set({ id: el.id, sfType: ELEMENT_TYPES.ELLIPSE });
      applyCommonStyles(e, el);
      return e;
    }

    case ELEMENT_TYPES.DIAMOND: {
      const w = el.width || 120;
      const h = el.height || 80;
      const d = new fabric.Polygon(
        [{ x: w / 2, y: 0 }, { x: w, y: h / 2 }, { x: w / 2, y: h }, { x: 0, y: h / 2 }],
        { originX: 'left', originY: 'top', exactBoundingBox: true }
      );
      d.set({ id: el.id, sfType: ELEMENT_TYPES.DIAMOND });
      applyCommonStyles(d, el);
      return d;
    }

    case ELEMENT_TYPES.TRIANGLE: {
      const w = el.width || 120;
      const h = el.height || 100;
      const t = new fabric.Polygon(
        [{ x: w / 2, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
        { originX: 'left', originY: 'top', exactBoundingBox: true }
      );
      t.set({ id: el.id, sfType: ELEMENT_TYPES.TRIANGLE });
      applyCommonStyles(t, el);
      return t;
    }

    case ELEMENT_TYPES.STAR: {
      const w = el.width || 120;
      const h = el.height || 120;
      const points = buildStarPoints(w, h, 5);
      const s = new fabric.Polygon(points, { originX: 'left', originY: 'top', exactBoundingBox: true });
      s.set({ id: el.id, sfType: ELEMENT_TYPES.STAR });
      applyCommonStyles(s, el);
      return s;
    }

    case ELEMENT_TYPES.FRAME: {
      const w = el.width || 320;
      const h = el.height || 240;
      const title = el.title || 'Section';
      const bg = new fabric.Rect({
        width: w,
        height: h,
        fill: el.fill || 'rgba(99, 102, 241, 0.06)',
        stroke: el.stroke || '#6366f1',
        strokeWidth: el.strokeWidth || 2,
        rx: 12,
        ry: 12,
        selectable: false,
        evented: false,
      });
      const label = new fabric.Textbox(title, {
        left: 14,
        top: 10,
        fontSize: 14,
        fontFamily: el.fontFamily || 'Virgil, Segoe UI, sans-serif',
        fill: el.stroke || '#6366f1',
        width: Math.max(w - 28, 80),
        selectable: false,
        evented: false,
      });
      const group = new fabric.Group([bg, label], { subTargetCheck: false });
      group.set({
        id: el.id,
        sfType: ELEMENT_TYPES.FRAME,
        sfTitle: title,
        left: el.x ?? 0,
        top: el.y ?? 0,
        angle: el.rotation || 0,
        opacity: el.opacity ?? 1,
      });
      return group;
    }

    case ELEMENT_TYPES.LINE: {
      const start = el.start || { x: 0, y: 0 };
      const end = el.end || { x: el.width || 100, y: 0 };
      const line = new fabric.Line([start.x, start.y, end.x, end.y], {
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        selectable: true,
        evented: true,
        originX: 'left',
        originY: 'top',
        strokeDashArray: el.dash?.length ? el.dash : null,
      });
      line.set({ 
        id: el.id, 
        sfType: ELEMENT_TYPES.LINE, 
        opacity: el.opacity ?? 1,
        startElementId: el.startElementId || null,
        endElementId: el.endElementId || null,
      });
      return line;
    }

    case ELEMENT_TYPES.ARROW:
      return createArrowGroup(el);

    case ELEMENT_TYPES.TEXT: {
      const text = new fabric.Textbox(el.text || 'Text', {
        fontSize: el.fontSize || 18,
        fontFamily: el.fontFamily || 'Virgil, Segoe UI, sans-serif',
        fill: el.stroke || '#1e1e1e',
        opacity: el.opacity ?? 1,
        width: el.width || 200,
      });
      text.set({ id: el.id, sfType: ELEMENT_TYPES.TEXT, left: el.x, top: el.y, angle: el.rotation || 0 });
      return text;
    }

    case ELEMENT_TYPES.IMAGE:
      return null; // use elementToFabricAsync

    case ELEMENT_TYPES.GROUP: {
      const children = (el.children || []).map(elementToFabric).filter(Boolean);
      if (!children.length) return null;
      const group = new fabric.Group(children, { subTargetCheck: true });
      group.set({
        id: el.id,
        sfType: ELEMENT_TYPES.GROUP,
        left: el.x ?? 0,
        top: el.y ?? 0,
        angle: el.rotation || 0,
        opacity: el.opacity ?? 1,
      });
      return group;
    }

    default:
      return null;
  }
}

export async function elementToFabricAsync(el) {
  if (el.type === ELEMENT_TYPES.IMAGE && el.src) {
    try {
      const img = await fabric.FabricImage.fromURL(el.src, { crossOrigin: 'anonymous' });
      const nw = el.naturalWidth || img.width || 200;
      const nh = el.naturalHeight || img.height || 200;
      img.set({
        id: el.id,
        sfType: ELEMENT_TYPES.IMAGE,
        sfSrc: el.src,
        left: el.x ?? 0,
        top: el.y ?? 0,
        angle: el.rotation || 0,
        opacity: el.opacity ?? 1,
        scaleX: (el.width || nw) / nw,
        scaleY: (el.height || nh) / nh,
      });
      return img;
    } catch {
      return null;
    }
  }
  return elementToFabric(el);
}

export function fabricToElement(obj) {
  const id = obj.id;
  if (!id || String(id).includes('__head')) return null;

  const base = {
    updatedAt: obj.sfUpdatedAt,
    updatedBy: obj.sfUpdatedBy,
  };

  if (obj.sfType === ELEMENT_TYPES.ARROW || (obj.type === 'group' && obj.sfType === ELEMENT_TYPES.ARROW)) {
    const matrix = obj.calcTransformMatrix();
    const line = obj._objects?.[0];
    if (!line) return null;
    const p1 = fabric.util.transformPoint({ x: line.x1, y: line.y1 }, matrix);
    const p2 = fabric.util.transformPoint({ x: line.x2, y: line.y2 }, matrix);
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.ARROW,
      x: 0,
      y: 0,
      rotation: 0,
      stroke: line.stroke || '#1e1e1e',
      strokeWidth: line.strokeWidth || 2,
      opacity: obj.opacity ?? 1,
      start: { x: p1.x, y: p1.y },
      end: { x: p2.x, y: p2.y },
      dash: line.strokeDashArray || [],
      startElementId: obj.startElementId || null,
      endElementId: obj.endElementId || null,
    };
  }

  if (obj.type === 'path' || obj.sfType === ELEMENT_TYPES.FREEHAND) {
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.FREEHAND,
      x: obj.left ?? 0,
      y: obj.top ?? 0,
      rotation: obj.angle || 0,
      scaleX: obj.scaleX ?? 1,
      scaleY: obj.scaleY ?? 1,
      stroke: obj.stroke || '#1e1e1e',
      strokeWidth: obj.strokeWidth || 2,
      opacity: obj.opacity ?? 1,
      fill: 'transparent',
      dash: obj.strokeDashArray || [],
      pathData: obj.path,
    };
  }

  if (obj.type === 'polyline') {
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.FREEHAND,
      x: obj.left,
      y: obj.top,
      rotation: obj.angle || 0,
      stroke: obj.stroke || '#1e1e1e',
      strokeWidth: obj.strokeWidth || 2,
      opacity: obj.opacity ?? 1,
      fill: 'transparent',
      dash: obj.strokeDashArray || [],
      points: obj.points || [],
    };
  }

  if (obj.type === 'polygon') {
    const polyType = obj.sfType || ELEMENT_TYPES.DIAMOND;
    return {
      ...base,
      id,
      type: polyType,
      x: obj.left,
      y: obj.top,
      rotation: obj.angle || 0,
      stroke: obj.stroke || '#1e1e1e',
      strokeWidth: obj.strokeWidth || 2,
      opacity: obj.opacity ?? 1,
      fill: obj.fill || 'transparent',
      width: (obj.width || 0) * (obj.scaleX || 1),
      height: (obj.height || 0) * (obj.scaleY || 1),
      dash: obj.strokeDashArray || [],
    };
  }

  if (obj.type === 'group' && obj.sfType === ELEMENT_TYPES.FRAME) {
    const bg = obj._objects?.[0];
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.FRAME,
      x: obj.left,
      y: obj.top,
      rotation: obj.angle || 0,
      stroke: bg?.stroke || '#6366f1',
      strokeWidth: bg?.strokeWidth || 2,
      opacity: obj.opacity ?? 1,
      fill: bg?.fill || 'rgba(99, 102, 241, 0.06)',
      width: (obj.width || 0) * (obj.scaleX || 1),
      height: (obj.height || 0) * (obj.scaleY || 1),
      title: obj.sfTitle || 'Section',
    };
  }

  if (obj.type === 'rect') {
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.RECT,
      x: obj.left,
      y: obj.top,
      rotation: obj.angle || 0,
      stroke: obj.stroke || '#1e1e1e',
      strokeWidth: obj.strokeWidth || 2,
      opacity: obj.opacity ?? 1,
      fill: obj.fill || 'transparent',
      width: obj.width * (obj.scaleX || 1),
      height: obj.height * (obj.scaleY || 1),
      dash: obj.strokeDashArray || [],
      rounded: (obj.rx || 0) > 0,
    };
  }

  if (obj.type === 'ellipse') {
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.ELLIPSE,
      x: obj.left,
      y: obj.top,
      rotation: obj.angle || 0,
      stroke: obj.stroke || '#1e1e1e',
      strokeWidth: obj.strokeWidth || 2,
      opacity: obj.opacity ?? 1,
      fill: obj.fill || 'transparent',
      width: obj.rx * 2 * (obj.scaleX || 1),
      height: obj.ry * 2 * (obj.scaleY || 1),
      dash: obj.strokeDashArray || [],
    };
  }

  if (obj.type === 'line') {
    const matrix = obj.calcTransformMatrix();
    const cx = (obj.x1 + obj.x2) / 2;
    const cy = (obj.y1 + obj.y2) / 2;
    const p1 = fabric.util.transformPoint({ x: obj.x1 - cx, y: obj.y1 - cy }, matrix);
    const p2 = fabric.util.transformPoint({ x: obj.x2 - cx, y: obj.y2 - cy }, matrix);
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.LINE,
      x: 0,
      y: 0,
      rotation: 0,
      stroke: obj.stroke || '#1e1e1e',
      strokeWidth: obj.strokeWidth || 2,
      opacity: obj.opacity ?? 1,
      start: { x: p1.x, y: p1.y },
      end: { x: p2.x, y: p2.y },
      dash: obj.strokeDashArray || [],
      startElementId: obj.startElementId || null,
      endElementId: obj.endElementId || null,
    };
  }

  if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.TEXT,
      x: obj.left,
      y: obj.top,
      rotation: obj.angle || 0,
      stroke: obj.fill || '#1e1e1e',
      strokeWidth: 1,
      opacity: obj.opacity ?? 1,
      text: obj.text || '',
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      width: obj.width,
    };
  }

  if (obj.type === 'image') {
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.IMAGE,
      x: obj.left,
      y: obj.top,
      rotation: obj.angle || 0,
      opacity: obj.opacity ?? 1,
      src: obj.sfSrc || obj.getSrc?.() || obj._originalElement?.src || '',
      width: obj.width * (obj.scaleX || 1),
      height: obj.height * (obj.scaleY || 1),
      naturalWidth: obj.width,
      naturalHeight: obj.height,
    };
  }

  if (obj.type === 'group' && obj.sfType === ELEMENT_TYPES.GROUP) {
    return {
      ...base,
      id,
      type: ELEMENT_TYPES.GROUP,
      x: obj.left,
      y: obj.top,
      rotation: obj.angle || 0,
      opacity: obj.opacity ?? 1,
      children: (obj._objects || []).map(fabricToElement).filter(Boolean),
    };
  }

  return null;
}

export function clearCanvas(canvas) {
  canvas.getObjects().forEach((o) => canvas.remove(o));
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

export function applyStylesToObject(obj, styles) {
  if (!obj || !styles) return;
  const dash = styles.dashed ? [8, 4] : null;
  if (obj.type === 'textbox' || obj.type === 'text') {
    obj.set({ fill: styles.stroke, fontSize: styles.fontSize, fontFamily: styles.fontFamily, opacity: styles.opacity });
  } else if (obj.type === 'image') {
    obj.set({ opacity: styles.opacity });
  } else if (obj.type === 'group') {
    obj._objects?.forEach((child) => applyStylesToObject(child, styles));
    obj.set({ opacity: styles.opacity });
  } else {
    obj.set({ stroke: styles.stroke, fill: styles.fill, strokeWidth: styles.strokeWidth, opacity: styles.opacity, strokeDashArray: dash });
    if (obj.type === 'rect' && styles.rounded !== undefined) {
      obj.set({ rx: styles.rounded ? 12 : 0, ry: styles.rounded ? 12 : 0 });
    }
    applyShapeRenderDefaults(obj, styles.strokeWidth);
  }
  obj.setCoords();
}

export { buildStarPoints };

export async function loadElementsOntoCanvas(canvas, elements, { canEdit = true } = {}) {
  clearCanvas(canvas);
  for (const el of elements) {
    const obj = el.type === 'image' ? await elementToFabricAsync(el) : elementToFabric(el);
    if (!obj) continue;
    obj.set({ selectable: canEdit, evented: canEdit, id: el.id });
    if (el.updatedAt) obj.set({ sfUpdatedAt: el.updatedAt, sfUpdatedBy: el.updatedBy });
    applyShapeRenderDefaults(obj, el.strokeWidth);
    canvas.add(obj);
  }
  canvas.requestRenderAll();
}
