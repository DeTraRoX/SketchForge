function stampElements(elements, userId) {
  const now = Date.now();
  return elements.map((el) => ({
    ...el,
    updatedAt: now,
    updatedBy: userId || el.updatedBy || null,
  }));
}

function mergeElements(base = [], incoming = [], deletedIds = []) {
  const map = new Map();

  for (const el of base) {
    if (el?.id) map.set(el.id, el);
  }

  for (const el of incoming) {
    if (!el?.id) continue;
    const existing = map.get(el.id);
    const elTime = el.updatedAt || 0;
    const exTime = existing?.updatedAt || 0;
    if (!existing || elTime >= exTime) {
      map.set(el.id, el);
    }
  }

  for (const id of deletedIds || []) {
    map.delete(id);
  }

  return Array.from(map.values()).sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
}

function collectDeletedIds(before = [], after = []) {
  const afterIds = new Set(after.map((e) => e.id));
  return before.filter((e) => e.id && !afterIds.has(e.id)).map((e) => e.id);
}

module.exports = { stampElements, mergeElements, collectDeletedIds };
