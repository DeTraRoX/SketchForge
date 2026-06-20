import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { api } from '../api/client';
import { useHistory } from './useHistory';
import { deserializeCanvasState, serializeCanvasState } from './canvasSchema';
import {
  elementToFabric,
  elementToFabricAsync,
  fabricToElement,
  clearCanvas,
  applyStylesToObject,
  loadElementsOntoCanvas,
  applyShapeRenderDefaults,
  buildStarPoints,
} from './fabricCanvas';
import { useCanvasStore } from '../store/useCanvasStore';
import { stampElements, mergeElements, collectDeletedIds } from './elementMerge';

function uid() {
  return `el_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function getCardinalAnchors(shapeObj) {
  const center = shapeObj.getCenterPoint();
  const cx = center.x;
  const cy = center.y;
  const w = shapeObj.width * shapeObj.scaleX;
  const h = shapeObj.height * shapeObj.scaleY;
  const rad = (shapeObj.angle || 0) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return [
    { x: cx + (h / 2) * sin, y: cy - (h / 2) * cos, name: 'top' },
    { x: cx - (h / 2) * sin, y: cy + (h / 2) * cos, name: 'bottom' },
    { x: cx - (w / 2) * cos, y: cy - (w / 2) * sin, name: 'left' },
    { x: cx + (w / 2) * cos, y: cy + (w / 2) * sin, name: 'right' },
  ];
}

function getClosestAnchor(shapeObj, targetPoint) {
  const anchors = getCardinalAnchors(shapeObj);
  let closest = anchors[0];
  let minDist = Infinity;
  for (const anchor of anchors) {
    const dist = Math.hypot(anchor.x - targetPoint.x, anchor.y - targetPoint.y);
    if (dist < minDist) {
      minDist = dist;
      closest = anchor;
    }
  }
  return closest;
}

function findNearestShapeAndAnchor(canvas, point, excludeId) {
  let nearestShape = null;
  let nearestAnchor = null;
  let minDist = 40; // max snapping distance in pixels

  canvas.getObjects().forEach((o) => {
    if (!o.id || o.id === excludeId) return;
    if (
      ['line', 'path', 'polyline'].includes(o.type) ||
      o.sfType === 'freehand' ||
      o.sfType === 'arrow' ||
      o.sfType === 'line'
    ) {
      return;
    }

    const anchors = getCardinalAnchors(o);
    anchors.forEach((anchor) => {
      const dist = Math.hypot(anchor.x - point.x, anchor.y - point.y);
      if (dist < minDist) {
        minDist = dist;
        nearestShape = o;
        nearestAnchor = anchor;
      }
    });
  });

  return nearestShape ? { shape: nearestShape, anchor: nearestAnchor } : null;
}

function bindLineConnections(canvas, lineOrArrow) {
  if (!canvas || !lineOrArrow) return;
  if (lineOrArrow.sfType !== 'line' && lineOrArrow.sfType !== 'arrow') return;

  let startPoint = null;
  let endPoint = null;

  if (lineOrArrow.sfType === 'line') {
    startPoint = { x: lineOrArrow.x1, y: lineOrArrow.y1 };
    endPoint = { x: lineOrArrow.x2, y: lineOrArrow.y2 };
  } else {
    const el = fabricToElement(lineOrArrow);
    if (!el) return;
    startPoint = el.start;
    endPoint = el.end;
  }

  const startSnap = findNearestShapeAndAnchor(canvas, startPoint, lineOrArrow.id);
  const endSnap = findNearestShapeAndAnchor(canvas, endPoint, lineOrArrow.id);

  let newStart = startPoint;
  let newEnd = endPoint;
  let changed = false;

  if (startSnap) {
    lineOrArrow.set({ startElementId: startSnap.shape.id });
    newStart = startSnap.anchor;
    changed = true;
  } else {
    lineOrArrow.set({ startElementId: null });
  }

  if (endSnap) {
    lineOrArrow.set({ endElementId: endSnap.shape.id });
    newEnd = endSnap.anchor;
    changed = true;
  } else {
    lineOrArrow.set({ endElementId: null });
  }

  if (changed) {
    if (lineOrArrow.sfType === 'line') {
      lineOrArrow.set({ x1: newStart.x, y1: newStart.y, x2: newEnd.x, y2: newEnd.y });
      lineOrArrow.setCoords();
    } else {
      const el = fabricToElement(lineOrArrow);
      if (el) {
        const nextArrow = elementToFabric({
          ...el,
          start: newStart,
          end: newEnd,
          startElementId: startSnap ? startSnap.shape.id : null,
          endElementId: endSnap ? endSnap.shape.id : null,
        });
        if (nextArrow) {
          nextArrow.set({
            id: lineOrArrow.id,
            selectable: lineOrArrow.selectable,
            evented: lineOrArrow.evented,
            sfUpdatedAt: lineOrArrow.sfUpdatedAt,
            sfUpdatedBy: lineOrArrow.sfUpdatedBy,
          });
          canvas.add(nextArrow);
          canvas.remove(lineOrArrow);
        }
      }
    }
    canvas.requestRenderAll();
  }
}

function updateConnections(canvas) {
  if (!canvas) return;
  let changed = false;
  const replacements = [];

  canvas.getObjects().forEach((obj) => {
    if (obj.sfType === 'line' || obj.sfType === 'arrow') {
      const startId = obj.startElementId;
      const endId = obj.endElementId;
      if (!startId && !endId) return;

      const startShape = startId ? canvas.getObjects().find((o) => o.id === startId) : null;
      const endShape = endId ? canvas.getObjects().find((o) => o.id === endId) : null;

      let startPoint = null;
      let endPoint = null;
      let currentStart = null;
      let currentEnd = null;

      if (obj.sfType === 'line') {
        currentStart = { x: obj.x1, y: obj.y1 };
        currentEnd = { x: obj.x2, y: obj.y2 };
      } else {
        const el = fabricToElement(obj);
        if (el) {
          currentStart = el.start;
          currentEnd = el.end;
        }
      }

      if (!currentStart || !currentEnd) return;

      if (startShape) {
        const targetForStart = endShape ? endShape.getCenterPoint() : currentEnd;
        startPoint = getClosestAnchor(startShape, targetForStart);
      } else {
        startPoint = currentStart;
      }

      if (endShape) {
        const targetForEnd = startShape ? startShape.getCenterPoint() : currentStart;
        endPoint = getClosestAnchor(endShape, targetForEnd);
      } else {
        endPoint = currentEnd;
      }

      const distStart = Math.hypot(startPoint.x - currentStart.x, startPoint.y - currentStart.y);
      const distEnd = Math.hypot(endPoint.x - currentEnd.x, endPoint.y - currentEnd.y);

      if (distStart > 0.1 || distEnd > 0.1) {
        changed = true;
        if (obj.sfType === 'line') {
          obj.set({ x1: startPoint.x, y1: startPoint.y, x2: endPoint.x, y2: endPoint.y });
          obj.setCoords();
        } else {
          const el = fabricToElement(obj);
          if (el) {
            replacements.push({
              oldObj: obj,
              el: {
                ...el,
                start: startPoint,
                end: endPoint,
              },
            });
          }
        }
      }
    }
  });

  replacements.forEach(({ oldObj, el }) => {
    const nextArrow = elementToFabric(el);
    if (nextArrow) {
      nextArrow.set({
        id: oldObj.id,
        selectable: oldObj.selectable,
        evented: oldObj.evented,
        sfUpdatedAt: oldObj.sfUpdatedAt,
        sfUpdatedBy: oldObj.sfUpdatedBy,
      });
      canvas.add(nextArrow);
      canvas.remove(oldObj);
    }
  });

  if (changed) {
    canvas.requestRenderAll();
  }
}

export default function useInfiniteFabricBoard({ boardId, socket, initialBoard, canEdit = true, userId }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const spaceDownRef = useRef(false);
  const revisionRef = useRef(0);
  const lastElementsRef = useRef([]);
  const elementsHistory = useHistory([]);
  const historyRef = useRef(elementsHistory);
  historyRef.current = elementsHistory;
  const toolHandlersRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const pendingBoardRef = useRef(null);

  const tool = useCanvasStore((s) => s.tool);
  const styles = useCanvasStore((s) => s.styles);
  const zoom = useCanvasStore((s) => s.zoom);
  const gridStyle = useCanvasStore((s) => s.gridStyle);
  const theme = useCanvasStore((s) => s.theme);
  const setZoom = useCanvasStore((s) => s.setZoom);

  const getElements = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    return canvas.getObjects().map((o) => fabricToElement(o)).filter(Boolean);
  }, []);

  const loadElements = useCallback(async (elements, skipHistory = false) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      pendingBoardRef.current = { elements, skipHistory };
      return;
    }
    try {
      await loadElementsOntoCanvas(canvas, elements, { canEdit });
      if (!skipHistory) historyRef.current.setPresent(elements);
      lastElementsRef.current = elements;
    } catch (err) {
      console.error('Failed to load canvas elements:', err);
    }
  }, [canEdit]);

  const commit = useCallback(() => {
    if (isRemoteUpdate.current) return;
    const rawElements = getElements();
    const stamped = stampElements(rawElements, userId);
    const deletedIds = collectDeletedIds(lastElementsRef.current, stamped);
    lastElementsRef.current = stamped;
    historyRef.current.setPresent(stamped);

    if (boardId && canEdit) {
      const state = serializeCanvasState({
        elements: stamped,
        revision: revisionRef.current,
        settings: {
          backgroundColor: theme === 'dark' ? '#0f0f1a' : '#fafbff',
          gridStyle,
          gridEnabled: gridStyle !== 'none',
          theme,
        },
      });
      debouncedSave(state, deletedIds);
      socket?.emit('board:elements:update', {
        boardId,
        elements: stamped,
        deletedIds,
        revision: revisionRef.current,
      });
    }
  }, [boardId, canEdit, getElements, gridStyle, socket, theme, userId]);

  const debouncedSave = useRef(
    debounce((state, deletedIds) => {
      api.put(`/api/boards/${boardId}`, {
        elements: state.elements,
        settings: state.settings,
        revision: state.revision,
        deletedIds,
      }).then((res) => {
        if (res.data?.revision != null) revisionRef.current = res.data.revision;
        if (res.data?.board?.elements) lastElementsRef.current = res.data.board.elements;
      }).catch(() => {});
    }, 800)
  ).current;

  // Init canvas (div container + ResizeObserver for reliable sizing)
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let canvas = null;
    let disposed = false;
    let onKeyDown = null;
    let onKeyUp = null;

    const drawGrid = (c) => {
      if (gridStyle === 'none') {
        c.set('backgroundColor', theme === 'dark' ? '#0f0f1a' : '#fafbff');
        c.requestRenderAll();
        return;
      }
      const gridSize = 24;
      const color = theme === 'dark' ? '#1c1c2e' : '#cbd5e1';
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = gridSize;
      patternCanvas.height = gridSize;
      const ctx = patternCanvas.getContext('2d');
      if (gridStyle === 'dots') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(gridSize, gridSize, 1.2, 0, 2 * Math.PI);
        ctx.fill();
      } else if (gridStyle === 'gridlines') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(gridSize, 0);
        ctx.lineTo(gridSize, gridSize);
        ctx.lineTo(0, gridSize);
        ctx.stroke();
      }
      const pattern = new fabric.Pattern({ source: patternCanvas, repeat: 'repeat' });
      c.set('backgroundColor', pattern);
      c.requestRenderAll();
    };

    const attachListeners = (c) => {
      let panning = false;
      let lastPan = null;

      c.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY;
        let z = c.getZoom();
        z *= 0.999 ** delta;
        z = Math.min(3, Math.max(0.1, z));
        c.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, z);
        setZoom(z);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });

      onKeyDown = (e) => {
        const active = c.getActiveObject();
        if (active?.isEditing) return;

        if (e.code === 'Space' && !e.repeat) {
          spaceDownRef.current = true;
          c.defaultCursor = 'grab';
        }
        const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
        const ctrl = isMac ? e.metaKey : e.ctrlKey;
        if (ctrl && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          const state = e.shiftKey ? historyRef.current.redo() : historyRef.current.undo();
          if (state) loadElements(state, true);
        }
        if (ctrl && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          duplicateSelected();
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && tool === 'select') {
          const objs = c.getActiveObjects();
          if (objs.length && document.activeElement?.tagName !== 'INPUT') {
            e.preventDefault();
            objs.forEach((o) => c.remove(o));
            c.discardActiveObject();
            c.requestRenderAll();
            commit();
          }
        }
        if (ctrl && e.key.toLowerCase() === 'c') {
          const active = c.getActiveObjects();
          if (active.length) {
            const map = new Map(getElements().map((el) => [el.id, el]));
            window.__sf_clipboard = active.map((o) => map.get(o.id)).filter(Boolean);
          }
        }
        if (ctrl && e.key.toLowerCase() === 'v') {
          const copied = window.__sf_clipboard || [];
          if (copied.length) {
            const next = copied.map((el) => ({ ...el, id: uid(), x: (el.x || 0) + 20, y: (el.y || 0) + 20 }));
            next.forEach((item) => {
              const obj = elementToFabric(item);
              if (obj) { obj.set({ id: item.id }); c.add(obj); }
            });
            c.requestRenderAll();
            commit();
          }
        }
        if (ctrl && e.key.toLowerCase() === 'g' && !e.shiftKey) {
          e.preventDefault();
          groupSelected();
        }
        if (ctrl && e.key.toLowerCase() === 'g' && e.shiftKey) {
          e.preventDefault();
          ungroupSelected();
        }
      };

      onKeyUp = (e) => {
        if (e.code === 'Space') {
          spaceDownRef.current = false;
          panning = false;
          lastPan = null;
          c.defaultCursor = 'default';
        }
      };

      const onMouseDown = (opt) => {
        if (spaceDownRef.current) {
          panning = true;
          lastPan = { x: opt.e.clientX, y: opt.e.clientY };
          c.defaultCursor = 'grabbing';
        }
      };
      const onMouseMove = (opt) => {
        if (panning && lastPan) {
          const vpt = c.viewportTransform;
          vpt[4] += opt.e.clientX - lastPan.x;
          vpt[5] += opt.e.clientY - lastPan.y;
          c.requestRenderAll();
          lastPan = { x: opt.e.clientX, y: opt.e.clientY };
        }
        if (socket && boardId) {
          const p = c.getScenePoint(opt.e);
          socket.emit('board:cursor', { boardId, cursor: { x: p.x, y: p.y } });
        }
      };
      const onMouseUp = () => {
        panning = false;
        lastPan = null;
        if (spaceDownRef.current) c.defaultCursor = 'grab';
      };

      const onObjectTransform = (opt) => {
        const target = opt.target;
        if (!target) return;
        const isConnector = (obj) => {
          if (!obj) return false;
          if (obj.sfType === 'line' || obj.sfType === 'arrow') return true;
          if (obj.type === 'activeSelection' || obj.type === 'group') {
            const objects = obj.getObjects ? obj.getObjects() : (obj._objects || []);
            return objects.length > 0 && objects.every((o) => o.sfType === 'line' || o.sfType === 'arrow');
          }
          return false;
        };
        if (isConnector(target)) return;
        updateConnections(c);
      };

      const onObjectModified = (opt) => {
        const target = opt.target;
        if (target) {
          if (target.sfType === 'line' || target.sfType === 'arrow') {
            bindLineConnections(c, target);
          } else if (target.type === 'activeSelection' || target.type === 'group') {
            const objects = target.getObjects ? target.getObjects() : (target._objects || []);
            objects.forEach((o) => {
              if (o.sfType === 'line' || o.sfType === 'arrow') {
                bindLineConnections(c, o);
              }
            });
            updateConnections(c);
          } else {
            updateConnections(c);
          }
        }
        commit();
      };

      const onObjectRemoved = (opt) => {
        const target = opt.target;
        if (target && target.sfType !== 'line' && target.sfType !== 'arrow') {
          c.getObjects().forEach((o) => {
            if (o.sfType === 'line' || o.sfType === 'arrow') {
              if (o.startElementId === target.id) {
                o.set({ startElementId: null });
              }
              if (o.endElementId === target.id) {
                o.set({ endElementId: null });
              }
            }
          });
        }
        commit();
      };

      c.on('mouse:down', onMouseDown);
      c.on('mouse:move', onMouseMove);
      c.on('mouse:up', onMouseUp);
      c.on('object:moving', onObjectTransform);
      c.on('object:scaling', onObjectTransform);
      c.on('object:rotating', onObjectTransform);
      c.on('object:modified', onObjectModified);
      c.on('object:removed', onObjectRemoved);
      c.on('text:changed', commit);
      c.on('text:editing:exited', commit);

      const emitSelection = () => {
        if (!socket || !boardId) return;
        const active = c.getActiveObjects();
        const elementIds = active.map((o) => o.id).filter(Boolean);
        let bounds = null;
        if (active.length === 1) {
          const rect = active[0].getBoundingRect();
          bounds = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        }
        socket.emit('board:selection', { boardId, elementIds, bounds });
      };
      c.on('selection:created', emitSelection);
      c.on('selection:updated', emitSelection);
      c.on('selection:cleared', () => {
        if (socket && boardId) socket.emit('board:selection', { boardId, elementIds: [], bounds: null });
      });
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    };

    const setupCanvas = () => {
      if (disposed || canvas) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 2 || h < 2) return;

      try {
        const canvasEl = document.createElement('canvas');
        el.replaceChildren(canvasEl);
        canvas = new fabric.Canvas(canvasEl, {
          selection: canEdit,
          preserveObjectStacking: true,
          skipOffscreen: false,
          backgroundColor: theme === 'dark' ? '#0f0f1a' : '#fafbff',
        });
        canvas.setDimensions({ width: w, height: h });
      } catch (err) {
        console.error('Fabric canvas init failed:', err);
        return;
      }

      canvasRef.current = canvas;
      canvas._drawGrid = () => drawGrid(canvas);
      drawGrid(canvas);
      attachListeners(canvas);
      setCanvasReady(true);

      if (pendingBoardRef.current) {
        const { elements, skipHistory } = pendingBoardRef.current;
        pendingBoardRef.current = null;
        loadElements(elements, skipHistory);
      }
    };

    const ro = new ResizeObserver(() => {
      if (!canvas) {
        setupCanvas();
        return;
      }
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      if (nw > 0 && nh > 0) {
        canvas.setDimensions({ width: nw, height: nh });
        canvas.requestRenderAll();
      }
    });
    ro.observe(el);
    requestAnimationFrame(setupCanvas);

    return () => {
      disposed = true;
      setCanvasReady(false);
      ro.disconnect();
      if (onKeyDown) window.removeEventListener('keydown', onKeyDown);
      if (onKeyUp) window.removeEventListener('keyup', onKeyUp);
      if (canvas) {
        canvas.dispose();
        canvas = null;
      }
      canvasRef.current = null;
      el.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function duplicateSelected() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    const map = new Map(getElements().map((el) => [el.id, el]));
    active.forEach((o) => {
      const el = map.get(o.id);
      if (!el) return;
      const copy = { ...el, id: uid(), x: (el.x || 0) + 20, y: (el.y || 0) + 20 };
      const obj = elementToFabric(copy);
      if (obj) { obj.set({ id: copy.id }); canvas.add(obj); }
    });
    canvas.requestRenderAll();
    commit();
  }

  function groupSelected() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length < 2) return;
    const group = new fabric.Group(active, { subTargetCheck: true });
    group.set({ id: uid(), sfType: 'group' });
    active.forEach((o) => canvas.remove(o));
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    commit();
  }

  function ungroupSelected() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'group') return;
    active._objects.forEach((o) => {
      o.set({ id: uid() });
      canvas.add(o);
    });
    canvas.remove(active);
    canvas.requestRenderAll();
    commit();
  }

  const lastLoadedBoardId = useRef(null);

  useEffect(() => {
    lastLoadedBoardId.current = null;
  }, [boardId]);
  useEffect(() => {
    if (!initialBoard || !canvasReady) return;
    const id = initialBoard._id;
    if (lastLoadedBoardId.current === id) return;
    lastLoadedBoardId.current = id;

    const payload = deserializeCanvasState({
      elements: initialBoard.elements || [],
      settings: initialBoard.settings || {},
      revision: initialBoard.revision,
    });
    revisionRef.current = payload.revision || 0;
    lastElementsRef.current = payload.elements;
    historyRef.current.reset(payload.elements);
    if (payload.settings?.theme) useCanvasStore.setState({ theme: payload.settings.theme });
    if (payload.settings?.gridStyle) {
      useCanvasStore.setState({ gridStyle: payload.settings.gridStyle });
    } else if (payload.settings?.gridEnabled !== undefined) {
      useCanvasStore.setState({ gridStyle: payload.settings.gridEnabled ? 'dots' : 'none' });
    }
    loadElements(payload.elements, true);
  }, [initialBoard, canvasReady, loadElements]);

  // Zoom sync
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const center = canvas.getCenter();
    canvas.zoomToPoint({ x: center.left, y: center.top }, zoom);
  }, [zoom]);

  // Grid/theme update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?._drawGrid) return;
    canvas._drawGrid();
  }, [gridStyle, theme]);

  // Tool behavior — re-attach when canvas becomes ready
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canEdit || !canvasReady) return;

    // Cleanup previous handlers
    if (toolHandlersRef.current) {
      const { down, move, up, pathCreated } = toolHandlersRef.current;
      canvas.off('mouse:down', down);
      canvas.off('mouse:move', move);
      canvas.off('mouse:up', up);
      if (pathCreated) canvas.off('path:created', pathCreated);
    }

    canvas.isDrawingMode = tool === 'freehand' || tool === 'pencil';
    canvas.selection = tool === 'select';
    canvas.defaultCursor = tool === 'text' ? 'text' : 'default';

    const isTextTarget = (obj) => obj && ['textbox', 'i-text', 'text'].includes(obj.type);

    const shapeStroke = () => styles.strokeWidth || 2;

    const isDegenerateShape = (obj) => {
      if (!obj) return true;
      if (tool === 'line' || tool === 'arrow') {
        return Math.hypot((obj.x2 ?? 0) - (obj.x1 ?? 0), (obj.y2 ?? 0) - (obj.y1 ?? 0)) < 3;
      }
      const w = obj.width ?? (obj.rx != null ? obj.rx * 2 : 0);
      const h = obj.height ?? (obj.ry != null ? obj.ry * 2 : 0);
      return w < 3 && h < 3;
    };

    const finalizeShape = (obj) => {
      if (!obj) return;
      applyShapeRenderDefaults(obj, shapeStroke());
      obj.set({ selectable: true, evented: true });
      obj.setCoords();
    };

    if (tool === 'freehand' || tool === 'pencil') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = styles.stroke;
      canvas.freeDrawingBrush.width = tool === 'pencil' ? 1 : styles.strokeWidth;
    }

    let start = null;
    let temp = null;
    let isDrawing = false;

    const pointerToCanvas = (e) => canvas.getScenePoint(e);

    const onPathCreated = (e) => {
      const path = e.path;
      if (!path) return;
      path.set({ id: uid(), sfType: 'freehand', selectable: true, evented: true });
      applyShapeRenderDefaults(path, shapeStroke());
      commit();
    };

    const onDown = (opt) => {
      if (spaceDownRef.current) return;
      const p = pointerToCanvas(opt.e);

      if (tool === 'eraser') {
        const { target } = canvas.findTarget(opt.e);
        if (target) {
          canvas.remove(target);
          canvas.requestRenderAll();
          commit();
        }
        return;
      }

      if (tool === 'select') return;

      if (tool === 'text') {
        const { target } = canvas.findTarget(opt.e);
        if (isTextTarget(target)) {
          canvas.setActiveObject(target);
          if (!target.isEditing) {
            target.enterEditing();
            target.selectAll();
          }
          return;
        }

        const t = new fabric.Textbox('', {
          left: p.x,
          top: p.y,
          fontSize: styles.fontSize,
          fontFamily: styles.fontFamily,
          fill: styles.stroke,
          opacity: styles.opacity,
          width: 220,
          editable: true,
        });
        t.set({ id: uid(), sfType: 'text' });
        applyStylesToObject(t, styles);
        canvas.add(t);
        canvas.setActiveObject(t);
        canvas.requestRenderAll();
        t.enterEditing();
        return;
      }

      if (['rectangle', 'ellipse', 'diamond', 'triangle', 'star', 'frame', 'line', 'arrow'].includes(tool)) {
        start = p;
        isDrawing = true;
        const dash = styles.dashed ? [8, 4] : null;
        const baseStroke = {
          fill: styles.fill,
          stroke: styles.stroke,
          strokeWidth: styles.strokeWidth,
          opacity: styles.opacity,
          strokeDashArray: dash,
        };

        if (tool === 'rectangle') {
          temp = new fabric.Rect({
            left: p.x, top: p.y, width: 1, height: 1,
            ...baseStroke,
            rx: styles.rounded ? 12 : 0, ry: styles.rounded ? 12 : 0,
          });
        } else if (tool === 'ellipse') {
          temp = new fabric.Ellipse({
            left: p.x, top: p.y,
            originX: 'left', originY: 'top',
            rx: 1, ry: 1,
            ...baseStroke,
          });
        } else if (tool === 'diamond') {
          temp = new fabric.Polygon(
            [{ x: 0.5, y: 0 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }],
            { left: p.x, top: p.y, ...baseStroke, exactBoundingBox: true }
          );
        } else if (tool === 'triangle') {
          temp = new fabric.Polygon(
            [{ x: 0.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
            { left: p.x, top: p.y, ...baseStroke, exactBoundingBox: true }
          );
          temp.set({ sfType: 'triangle' });
        } else if (tool === 'star') {
          temp = new fabric.Polygon(
            buildStarPoints(2, 2, 5),
            { left: p.x, top: p.y, ...baseStroke, exactBoundingBox: true }
          );
          temp.set({ sfType: 'star' });
        } else if (tool === 'frame') {
          temp = new fabric.Rect({
            left: p.x, top: p.y, width: 1, height: 1,
            fill: 'rgba(99, 102, 241, 0.06)',
            stroke: styles.stroke || '#6366f1',
            strokeWidth: styles.strokeWidth,
            opacity: styles.opacity,
            rx: 12, ry: 12,
          });
          temp.set({ sfType: 'frame' });
        } else if (tool === 'line' || tool === 'arrow') {
          temp = new fabric.Line([p.x, p.y, p.x, p.y], {
            stroke: styles.stroke,
            strokeWidth: styles.strokeWidth,
            opacity: styles.opacity,
            strokeDashArray: dash,
          });
          temp.set({ sfType: tool });
        }
        if (temp) {
          temp.set({ id: uid(), selectable: false, evented: false });
          applyShapeRenderDefaults(temp, shapeStroke());
          canvas.add(temp);
        }
      }
    };

    const onMove = (opt) => {
      if (!isDrawing || !start || !temp) return;
      const p = pointerToCanvas(opt.e);
      const left = Math.min(p.x, start.x);
      const top = Math.min(p.y, start.y);
      const width = Math.max(Math.abs(p.x - start.x), 1);
      const height = Math.max(Math.abs(p.y - start.y), 1);

      if (tool === 'rectangle') {
        temp.set({ width, height, left, top });
      } else if (tool === 'ellipse') {
        temp.set({
          rx: width / 2,
          ry: height / 2,
          left,
          top,
        });
      } else if (tool === 'diamond') {
        temp.set({
          points: [
            { x: width / 2, y: 0 },
            { x: width, y: height / 2 },
            { x: width / 2, y: height },
            { x: 0, y: height / 2 },
          ],
          left,
          top,
        });
        temp.setDimensions();
      } else if (tool === 'triangle') {
        temp.set({
          points: [{ x: width / 2, y: 0 }, { x: width, y: height }, { x: 0, y: height }],
          left,
          top,
        });
        temp.setDimensions();
      } else if (tool === 'star') {
        temp.set({
          points: buildStarPoints(width, height, 5),
          left,
          top,
        });
        temp.setDimensions();
      } else if (tool === 'frame') {
        temp.set({ width, height, left, top });
      } else if (tool === 'line' || tool === 'arrow') {
        temp.set({ x1: start.x, y1: start.y, x2: p.x, y2: p.y });
      }
      temp.setCoords();
      canvas.requestRenderAll();
    };

    const onUp = () => {
      if (!isDrawing || !temp) {
        isDrawing = false;
        start = null;
        return;
      }

      if (isDegenerateShape(temp)) {
        canvas.remove(temp);
        isDrawing = false;
        start = null;
        temp = null;
        canvas.requestRenderAll();
        return;
      }

      if (tool === 'arrow' && temp) {
        const x1 = temp.x1, y1 = temp.y1, x2 = temp.x2, y2 = temp.y2;
        canvas.remove(temp);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const size = 12 + styles.strokeWidth * 2;
        const line = new fabric.Line([x1, y1, x2, y2], {
          stroke: styles.stroke, strokeWidth: styles.strokeWidth, opacity: styles.opacity,
          strokeDashArray: styles.dashed ? [8, 4] : null,
        });
        const head = new fabric.Triangle({
          left: x2, top: y2, width: size, height: size,
          angle: (angle * 180) / Math.PI + 90,
          fill: styles.stroke, originX: 'center', originY: 'center',
          selectable: false, evented: false,
        });
        const group = new fabric.Group([line, head], { selectable: true, evented: true });
        group.set({ id: uid(), sfType: 'arrow' });
        applyShapeRenderDefaults(group, shapeStroke());
        canvas.add(group);
        bindLineConnections(canvas, group);
      } else if (tool === 'frame' && temp) {
        const w = temp.width * (temp.scaleX || 1);
        const h = temp.height * (temp.scaleY || 1);
        const left = temp.left;
        const top = temp.top;
        canvas.remove(temp);
        const bg = new fabric.Rect({
          width: w,
          height: h,
          fill: 'rgba(99, 102, 241, 0.06)',
          stroke: styles.stroke || '#6366f1',
          strokeWidth: styles.strokeWidth || 2,
          rx: 12,
          ry: 12,
          selectable: false,
          evented: false,
        });
        const label = new fabric.Textbox('Section', {
          left: 14,
          top: 10,
          fontSize: 14,
          fontFamily: styles.fontFamily,
          fill: styles.stroke || '#6366f1',
          width: Math.max(w - 28, 80),
          selectable: false,
          evented: false,
        });
        const group = new fabric.Group([bg, label], { subTargetCheck: false });
        group.set({ id: uid(), sfType: 'frame', sfTitle: 'Section', left, top });
        applyShapeRenderDefaults(group, shapeStroke());
        canvas.add(group);
        canvas.sendObjectToBack(group);
      } else {
        finalizeShape(temp);
        if (tool === 'line') {
          bindLineConnections(canvas, temp);
        }
      }

      isDrawing = false;
      start = null;
      temp = null;
      canvas.requestRenderAll();
      commit();
    };

    const onWindowUp = () => {
      if (isDrawing) onUp();
    };

    const onDblClick = (opt) => {
      const { target } = canvas.findTarget(opt.e);
      if (isTextTarget(target) && !target.isEditing) {
        canvas.setActiveObject(target);
        target.enterEditing();
        target.selectAll();
      }
    };

    canvas.on('mouse:down', onDown);
    canvas.on('mouse:move', onMove);
    canvas.on('mouse:up', onUp);
    canvas.on('mouse:dblclick', onDblClick);
    window.addEventListener('mouseup', onWindowUp);
    if (tool === 'freehand' || tool === 'pencil') canvas.on('path:created', onPathCreated);

    toolHandlersRef.current = { down: onDown, move: onMove, up: onUp, pathCreated: onPathCreated, windowUp: onWindowUp };

    return () => {
      canvas.off('mouse:down', onDown);
      canvas.off('mouse:move', onMove);
      canvas.off('mouse:up', onUp);
      canvas.off('mouse:dblclick', onDblClick);
      canvas.off('path:created', onPathCreated);
      window.removeEventListener('mouseup', onWindowUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, styles, canEdit, canvasReady]);

  const loadRemoteElements = useCallback((remoteElements, revision, deletedIds = []) => {
    const hasDeletes = deletedIds?.length > 0;
    if (revision != null && revision <= revisionRef.current && !hasDeletes) return;
    isRemoteUpdate.current = true;
    const merged = mergeElements(lastElementsRef.current, remoteElements, deletedIds);
    if (revision != null && revision > revisionRef.current) revisionRef.current = revision;
    lastElementsRef.current = merged;
    loadElements(merged, true).finally(() => {
      setTimeout(() => { isRemoteUpdate.current = false; }, 150);
    });
  }, [loadElements]);

  const applyServerState = useCallback((elements, revision) => {
    if (revision != null && revision <= revisionRef.current && lastLoadedBoardId.current) return;
    if (revision != null) revisionRef.current = revision;
    lastElementsRef.current = elements || [];
    isRemoteUpdate.current = true;
    loadElements(elements || [], true).finally(() => {
      setTimeout(() => { isRemoteUpdate.current = false; }, 150);
    });
  }, [loadElements]);

  const addImage = useCallback(async (file) => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let src = reader.result;
      try {
        const res = await api.post('/api/upload/image', { image: src });
        if (res.data?.url) src = res.data.url;
      } catch { /* use base64 fallback */ }

      const img = await fabric.FabricImage.fromURL(src);
      const maxW = 400;
      const scale = img.width > maxW ? maxW / img.width : 1;
      img.set({
        left: 100, top: 100,
        scaleX: scale, scaleY: scale,
        id: uid(),
        sfType: 'image',
        sfSrc: src,
        opacity: styles.opacity,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      commit();
    };
    reader.readAsDataURL(file);
  }, [styles.opacity, commit]);

  const applyTemplate = useCallback(async (elements) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const idMap = new Map();
    const newEls = elements.map((el) => {
      const newId = uid();
      idMap.set(el.id, newId);
      return { ...el, id: newId };
    });
    newEls.forEach((el) => {
      if (el.startElementId && idMap.has(el.startElementId)) {
        el.startElementId = idMap.get(el.startElementId);
      }
      if (el.endElementId && idMap.has(el.endElementId)) {
        el.endElementId = idMap.get(el.endElementId);
      }
    });
    for (const el of newEls) {
      const obj = el.type === 'image' ? await elementToFabricAsync(el) : elementToFabric(el);
      if (obj) {
        obj.set({
          id: el.id,
          startElementId: el.startElementId || null,
          endElementId: el.endElementId || null,
        });
        canvas.add(obj);
      }
    }
    canvas.requestRenderAll();
    commit();
  }, [commit]);

  const applyAIElements = useCallback((elements) => {
    applyTemplate(elements);
  }, [applyTemplate]);

  const applyStyleToSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach((o) => applyStylesToObject(o, styles));
    canvas.requestRenderAll();
    commit();
  }, [styles, commit]);

  return {
    hostRef,
    canvasRef,
    getElements,
    loadRemoteElements,
    applyServerState,
    addImage,
    applyTemplate,
    applyAIElements,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    applyStyleToSelection,
    undo: () => { const s = historyRef.current.undo(); if (s) loadElements(s, true); },
    redo: () => { const s = historyRef.current.redo(); if (s) loadElements(s, true); },
  };
}
