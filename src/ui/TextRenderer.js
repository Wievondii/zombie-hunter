// Fixed font sizes for 640×360 game resolution
// These are pixel-perfect constants, not derived from IH
export const FONT = {
  TITLE:    () => 28,
  SUBTITLE: () => 18,
  BODY:     () => 12,
  SMALL:    () => 10,
  TINY:     () => 8,
};

/**
 * Draw text with outline for readability on any background.
 * @param {CanvasRenderingContext2D} c
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {object} [opts]
 * @param {number}   [opts.size]       - font size in px (use FONT.*())
 * @param {string}   [opts.color]      - fill color
 * @param {string}   [opts.outline]    - outline color (default '#000')
 * @param {number}   [opts.outlineW]   - outline width (default auto from size)
 * @param {string}   [opts.align]      - 'left'|'center'|'right'
 * @param {string}   [opts.baseline]   - 'top'|'middle'|'alphabetic'
 * @param {boolean}  [opts.bold]       - use bold weight
 * @param {number}   [opts.alpha]      - global alpha
 * @param {string}   [opts.font]       - font family override
 */
export function drawText(c, text, x, y, opts = {}) {
  const size   = opts.size   ?? FONT.BODY();
  const color  = opts.color  ?? '#FFF';
  const outline= opts.outline?? '#000';
  const align  = opts.align  ?? 'left';
  const base   = opts.baseline ?? 'alphabetic';
  const bold   = opts.bold   ?? false;
  const alpha  = opts.alpha  ?? 1;
  const family = opts.font   ?? 'Courier New,monospace';
  const ow     = opts.outlineW ?? (size >= 14 ? 3 : size >= 10 ? 2 : 1);

  const prevAlpha = c.globalAlpha;
  c.globalAlpha = alpha;

  c.font = `${bold ? 'bold ' : ''}${size}px ${family}`;
  c.textAlign = align;
  c.textBaseline = base;

  if (ow > 0) {
    c.strokeStyle = outline;
    c.lineWidth = ow;
    c.lineJoin = 'round';
    c.strokeText(text, x, y);
  }

  c.fillStyle = color;
  c.fillText(text, x, y);

  c.globalAlpha = prevAlpha;
}

/**
 * Measure text width with given font size.
 */
export function measureText(c, text, size, bold = false, font = 'Courier New,monospace') {
  c.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
  return c.measureText(text).width;
}

/**
 * Draw a progress bar with outline.
 */
export function drawBar(c, x, y, w, h, ratio, fgColor, bgColor = '#222', outlineColor = '#000') {
  c.fillStyle = outlineColor;
  c.fillRect(x - 1, y - 1, w + 2, h + 2);
  c.fillStyle = bgColor;
  c.fillRect(x, y, w, h);
  c.fillStyle = fgColor;
  c.fillRect(x, y, Math.max(0, (w * ratio) | 0), h);
}
