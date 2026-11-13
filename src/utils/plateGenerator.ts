import { ArchivalSample } from '../types/hanNom';

/**
 * Renders a high-contrast archival plate image (woodblock, edict, or stone stele rubbing)
 * onto an HTML5 Canvas with real Unicode Hán Nôm glyphs arranged in traditional
 * vertical right-to-left columns so Vision OCR reads authentic strokes.
 */
export function renderSamplePlateToDataUrl(sample: ArchivalSample): string {
  const lines = sample.hanNomText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const maxCharsInCol = Math.max(...lines.map((l) => Array.from(l).length), 6);
  const colCount = lines.length;

  const charCell = 54;
  const colWidth = 74;
  const marginX = 72;
  const marginY = 64;

  const width = Math.max(540, colCount * colWidth + marginX * 2 + 40);
  const height = Math.max(520, maxCharsInCol * charCell + marginY * 2 + 40);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const isStele = sample.plateStyle === 'stele';
  const isEdict = sample.plateStyle === 'edict';

  // Background surface
  if (isStele) {
    ctx.fillStyle = '#242220';
    ctx.fillRect(0, 0, width, height);
    // Subtle stone texture speckles
    for (let i = 0; i < 1800; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233) * 43758.5453) % 1;
      const px = Math.abs(x) * width;
      const py = Math.abs(y) * height;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.18)';
      ctx.fillRect(px, py, 2, 2);
    }
  } else if (isEdict) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#F6E8C6');
    grad.addColorStop(1, '#EAD6A8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#F5EFE2');
    grad.addColorStop(1, '#EBE2CE');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Subtle paper fibers
  if (!isStele) {
    ctx.strokeStyle = 'rgba(120, 95, 60, 0.045)';
    ctx.lineWidth = 1;
    for (let y = 16; y < height; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  // Outer woodblock double border (Biên lan / 邊欄)
  const borderColor = isStele ? 'rgba(235, 230, 220, 0.45)' : 'rgba(42, 34, 28, 0.72)';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, width - 52, height - 52);

  ctx.lineWidth = 1;
  ctx.strokeRect(33, 33, width - 66, height - 66);

  // Column grid area
  const gridLeft = (width - colCount * colWidth) / 2;
  const gridTop = marginY;
  const gridHeight = maxCharsInCol * charCell + 18;

  // Vertical ruling lines (Ô tư lan / 烏絲欄)
  ctx.strokeStyle = isStele ? 'rgba(235, 230, 220, 0.22)' : 'rgba(55, 45, 38, 0.28)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= colCount; c++) {
    const x = gridLeft + c * colWidth;
    ctx.beginPath();
    ctx.moveTo(x, gridTop - 10);
    ctx.lineTo(x, gridTop + gridHeight);
    ctx.stroke();
  }
  ctx.strokeRect(gridLeft, gridTop - 10, colCount * colWidth, gridHeight + 10);

  // Draw Hán Nôm characters from RIGHT column to LEFT column
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 36px "Noto Serif TC", "Songti TC", "PMingLiU", serif';

  lines.forEach((line, lineIdx) => {
    // Column index from right to left
    const colIdx = colCount - 1 - lineIdx;
    const centerX = gridLeft + colIdx * colWidth + colWidth / 2;
    const chars = Array.from(line);

    chars.forEach((ch, charIdx) => {
      const centerY = gridTop + charIdx * charCell + charCell / 2;
      ctx.fillStyle = isStele ? '#F2EFE9' : '#1E1A17';
      ctx.fillText(ch, centerX, centerY);
    });
  });

  // Traditional Vermilion Seal (Triện ấn) at bottom-left
  const sealSize = 52;
  const sealX = 52;
  const sealY = height - sealSize - 48;
  ctx.save();
  ctx.strokeStyle = isStele ? 'rgba(185, 65, 45, 0.85)' : '#9A2B1F';
  ctx.fillStyle = isStele ? 'rgba(185, 65, 45, 0.14)' : 'rgba(154, 43, 31, 0.08)';
  ctx.lineWidth = 2;
  ctx.fillRect(sealX, sealY, sealSize, sealSize);
  ctx.strokeRect(sealX, sealY, sealSize, sealSize);

  const sealChars = Array.from(sample.sealText).slice(0, 4);
  ctx.fillStyle = isStele ? 'rgba(215, 85, 65, 0.92)' : '#9A2B1F';
  ctx.font = '700 15px "Noto Serif TC", serif';
  if (sealChars.length === 4) {
    ctx.fillText(sealChars[0], sealX + sealSize * 0.72, sealY + sealSize * 0.3);
    ctx.fillText(sealChars[1], sealX + sealSize * 0.72, sealY + sealSize * 0.72);
    ctx.fillText(sealChars[2], sealX + sealSize * 0.28, sealY + sealSize * 0.3);
    ctx.fillText(sealChars[3], sealX + sealSize * 0.28, sealY + sealSize * 0.72);
  }
  ctx.restore();

  // Subtle archival title caption inside bottom-right margin
  ctx.fillStyle = isStele ? 'rgba(235,230,220,0.45)' : 'rgba(87, 83, 78, 0.55)';
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(sample.era, width - 46, height - 42);

  return canvas.toDataURL('image/png');
}
