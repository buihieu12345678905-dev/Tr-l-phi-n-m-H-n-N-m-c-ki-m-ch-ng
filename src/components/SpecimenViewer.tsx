import React, { useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Contrast, RefreshCw } from 'lucide-react';

interface SpecimenViewerProps {
  imageUrl: string;
  caption?: string;
}

export const SpecimenViewer: React.FC<SpecimenViewerProps> = ({ imageUrl, caption }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setHighContrast(false);
  };

  return (
    <div className="border border-stone-200 bg-[#F3EFE6]/60 rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-[#FBF9F5] px-4 py-2.5">
        <span className="text-xs font-medium text-stone-600 truncate">
          {caption || 'Ảnh tư liệu đối chiếu'}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Thu nhỏ"
            className="cursor-pointer inline-flex items-center justify-center rounded border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-100 whitespace-nowrap shrink-0"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[44px] text-center font-mono text-xs text-stone-600 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Phóng to"
            className="cursor-pointer inline-flex items-center justify-center rounded border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-100 whitespace-nowrap shrink-0"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            title="Xoay 90 độ"
            className="cursor-pointer inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-100 whitespace-nowrap shrink-0"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Xoay</span>
          </button>
          <button
            type="button"
            onClick={() => setHighContrast((v) => !v)}
            title="Tăng tương phản nét mực"
            className={`cursor-pointer inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs transition-colors whitespace-nowrap shrink-0 ${
              highContrast
                ? 'border-[#9A3412] bg-[#9A3412] text-white'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Contrast className="h-3.5 w-3.5" />
            <span>Lọc nét</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Đặt lại góc nhìn"
            className="cursor-pointer inline-flex items-center justify-center rounded border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-100 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative flex h-[360px] w-full items-center justify-center overflow-auto bg-stone-900/5 p-4">
        <img
          src={imageUrl}
          alt={caption || 'Tư liệu Hán Nôm'}
          referrerPolicy="no-referrer"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            filter: highContrast ? 'contrast(1.45) grayscale(1)' : 'none',
            transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), filter 180ms ease',
          }}
          className="max-h-full max-w-full object-contain shadow-sm"
        />
      </div>
    </div>
  );
};
