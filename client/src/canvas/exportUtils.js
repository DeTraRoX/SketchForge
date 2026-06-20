export function exportAsJSON(elements, settings, title) {
  const payload = {
    version: 1,
    title,
    elements,
    settings,
    exportedAt: new Date().toISOString(),
    app: 'SketchForge',
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${sanitize(title)}.json`);
}

export function exportAsPNG(canvas, title) {
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
  const link = document.createElement('a');
  link.download = `${sanitize(title)}.png`;
  link.href = dataUrl;
  link.click();
}

export function exportAsSVG(canvas, title) {
  const svg = canvas.toSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  downloadBlob(blob, `${sanitize(title)}.svg`);
}

export async function exportAsPDF(canvas, title) {
  const { jsPDF } = await import('jspdf');
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });
  const orientation = img.width > img.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [img.width, img.height] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
  pdf.save(`${sanitize(title)}.pdf`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitize(name) {
  return (name || 'sketchforge-board').replace(/[^a-z0-9-_]/gi, '_').slice(0, 64);
}
