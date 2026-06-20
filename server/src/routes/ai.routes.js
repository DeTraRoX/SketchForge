const express = require('express');
const { requireAuth } = require('../middleware/authJwt');

const router = express.Router();

const SYSTEM_PROMPT = `You are a diagram generator for SketchForge whiteboard.
Return ONLY valid JSON with this shape:
{
  "elements": [
    {
      "id": "unique_string",
      "type": "rectangle|ellipse|diamond|line|arrow|text|freehand",
      "x": number, "y": number,
      "rotation": 0,
      "stroke": "#1e1e1e",
      "strokeWidth": 2,
      "opacity": 1,
      "fill": "transparent or hex color",
      "width": number, "height": number,
      "text": "only for text type",
      "fontSize": 16,
      "fontFamily": "Virgil, Segoe UI, sans-serif",
      "start": {"x":0,"y":0}, "end": {"x":100,"y":0},
      "rounded": boolean,
      "dash": []
    }
  ]
}
Use coordinates between 50-700. Create clear layouts for flowcharts, mind maps, or UML.
Use soft fills: #a5d8ff, #b2f2bb, #ffec99, #d0bfff, #ffc9c9.
Add text labels as separate text elements.`;

async function generateWithOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  const elements = (parsed.elements || []).map((el, i) => ({
    ...el,
    id: el.id || `ai_${Date.now()}_${i}`,
    updatedAt: Date.now(),
  }));
  return { elements, source: 'openai' };
}

function fallbackGenerate(prompt) {
  const text = (prompt || '').toLowerCase();
  const elements = [];
  const add = (el) => elements.push({ ...el, id: `fb_${Date.now()}_${elements.length}`, updatedAt: Date.now() });

  if (text.includes('mind')) {
    add({ type: 'ellipse', x: 280, y: 200, width: 200, height: 100, fill: '#d0bfff', stroke: '#4338ca', strokeWidth: 2, opacity: 1, rotation: 0, dash: [] });
    add({ type: 'text', x: 320, y: 235, text: 'Central Idea', fontSize: 18, stroke: '#1e1e1e', opacity: 1, rotation: 0, strokeWidth: 1 });
    [{ label: 'Branch A', x: 80, fill: '#a5d8ff' }, { label: 'Branch B', x: 560, fill: '#b2f2bb' }].forEach((b) => {
      add({ type: 'rectangle', x: b.x, y: 80, width: 120, height: 60, fill: b.fill, stroke: '#4338ca', strokeWidth: 2, opacity: 1, rotation: 0, dash: [], rounded: true });
      add({ type: 'text', x: b.x + 15, y: 100, text: b.label, fontSize: 14, stroke: '#1e1e1e', opacity: 1, rotation: 0, strokeWidth: 1 });
    });
  } else {
    add({ type: 'ellipse', x: 100, y: 80, width: 120, height: 60, fill: '#b2f2bb', stroke: '#4338ca', strokeWidth: 2, opacity: 1, rotation: 0, dash: [] });
    add({ type: 'text', x: 130, y: 100, text: 'Start', fontSize: 16, stroke: '#1e1e1e', opacity: 1, rotation: 0, strokeWidth: 1 });
    add({ type: 'rectangle', x: 100, y: 200, width: 140, height: 70, fill: '#a5d8ff', stroke: '#4338ca', strokeWidth: 2, opacity: 1, rotation: 0, dash: [], rounded: true });
    add({ type: 'text', x: 130, y: 225, text: 'Process', fontSize: 16, stroke: '#1e1e1e', opacity: 1, rotation: 0, strokeWidth: 1 });
    add({ type: 'ellipse', x: 100, y: 340, width: 120, height: 60, fill: '#ffc9c9', stroke: '#4338ca', strokeWidth: 2, opacity: 1, rotation: 0, dash: [] });
    add({ type: 'text', x: 140, y: 360, text: 'End', fontSize: 16, stroke: '#1e1e1e', opacity: 1, rotation: 0, strokeWidth: 1 });
    add({ type: 'arrow', x: 0, y: 0, stroke: '#4338ca', strokeWidth: 2, opacity: 1, start: { x: 160, y: 140 }, end: { x: 160, y: 200 } });
    add({ type: 'arrow', x: 0, y: 0, stroke: '#4338ca', strokeWidth: 2, opacity: 1, start: { x: 160, y: 270 }, end: { x: 160, y: 340 } });
  }
  return { elements, source: 'fallback' };
}

router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ message: 'prompt required' });

    let result = null;
    try {
      result = await generateWithOpenAI(prompt);
    } catch (e) {
      console.warn('OpenAI failed, using fallback:', e.message);
    }

    if (!result) result = fallbackGenerate(prompt);
    res.json({ ...result, prompt });
  } catch (e) {
    res.status(500).json({ message: 'Generation failed', error: String(e) });
  }
});

module.exports = router;
