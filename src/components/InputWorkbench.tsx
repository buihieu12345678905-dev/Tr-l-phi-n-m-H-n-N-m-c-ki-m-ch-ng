import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { ArchivalSample, DocType, InputMode, ReadingDirection } from '../types/hanNom';
import { ARCHIVAL_SAMPLES } from '../data/samples';
import { renderSamplePlateToDataUrl } from '../utils/plateGenerator';

interface InputWorkbenchProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  text: string;
  onTextChange: (text: string) => void;
  imageDataUrl: string | null;
  imageMimeType: string;
  imageName: string;
  onImageSelect: (dataUrl: string, mimeType: string, name: string) => void;
  onClearImage: () => void;
  docType: DocType;
  onDocTypeChange: (docType: DocType) => void;
  readingDirection: ReadingDirection;
  onReadingDirectionChange: (dir: ReadingDirection) => void;
  extraContext: string;
  onExtraContextChange: (ctx: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const InputWorkbench: React.FC<InputWorkbenchProps> = ({
  mode,
  onModeChange,
  text,
  onTextChange,
  imageDataUrl,
  imageName,
  onImageSelect,
  onClearImage,
  docType,
  onDocTypeChange,
  readingDirection,
  onReadingDirectionChange,
  extraContext,
  onExtraContextChange,
  onSubmit,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImageSelect(reader.result, file.type || 'image/png', file.name);
        onModeChange('image');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleLoadSample = (sample: ArchivalSample, targetMode: InputMode) => {
    onDocTypeChange(sample.docType);
    onReadingDirectionChange(sample.readingDirection);
    if (targetMode === 'text') {
      onTextChange(sample.hanNomText);
      onModeChange('text');
    } else {
      const dataUrl = renderSamplePlateToDataUrl(sample);
      onImageSelect(dataUrl, 'image/png', `${sample.title}.png`);
      onModeChange('image');
    }
  };

  const canSubmit =
    !isLoading &&
    ((mode === 'text' && text.trim().length > 0) || (mode === 'image' && Boolean(imageDataUrl)));

  return (
    <section className="border border-stone-200 bg-white rounded-lg p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="font-serif text-xl font-semibold text-stone-900">
            Tư liệu đầu vào
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Chọn nhập ký tự Hán Nôm trực tiếp hoặc tải ảnh mộc bản, sắc phong, văn bia để trích xuất và kiểm chứng
          </p>
        </div>

        {/* Segmented Control: Text vs Image */}
        <div className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-[#F3EFE6] p-1">
          <button
            type="button"
            onClick={() => onModeChange('text')}
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'text'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Nhập văn bản</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('image')}
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'image'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Tải ảnh tư liệu</span>
          </button>
        </div>
      </div>

      {/* Main Input Area */}
      <div className="mt-5 space-y-4">
        {mode === 'text' ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="han-nom-textarea" className="text-xs font-medium text-stone-700">
                Nguyên văn chữ Hán / Chữ Nôm
              </label>
              <span className="font-mono text-xs text-stone-500 tabular-nums">
                {Array.from(text.replace(/\s+/g, '')).length} ký tự
              </span>
            </div>
            <textarea
              id="han-nom-textarea"
              rows={6}
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Dán hoặc gõ văn bản Hán Nôm tại đây (ví dụ: 南國山河南帝居 / 百𢆥𥪞𡎝𠊛𢠩)..."
              className="font-han w-full rounded-md border border-stone-300 bg-[#FBF9F5] p-4 text-xl leading-relaxed tracking-wider text-stone-900 placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-stone-400 focus:border-[#9A3412] focus:outline-none"
            />
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {!imageDataUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
                className={`cursor-pointer flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging
                    ? 'border-[#9A3412] bg-[#9A3412]/5'
                    : 'border-stone-300 bg-[#FBF9F5] hover:border-stone-400'
                }`}
              >
                <Upload className="h-7 w-7 text-stone-500" />
                <p className="mt-3 text-sm font-medium text-stone-800">
                  Kéo thả ảnh tư liệu vào đây hoặc bấm để chọn tệp
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Hỗ trợ PNG, JPG, WEBP · Bản khắc mộc bản, sắc phong, thác bản văn bia, gia phả
                </p>
              </div>
            ) : (
              <div className="border border-stone-200 bg-[#FBF9F5] rounded-md p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-stone-700">
                    {imageName || 'Tư liệu ảnh đã nạp'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer text-xs font-medium text-[#9A3412] hover:underline whitespace-nowrap"
                    >
                      Đổi ảnh khác
                    </button>
                    <button
                      type="button"
                      onClick={onClearImage}
                      aria-label="Xóa ảnh"
                      className="cursor-pointer rounded p-1 text-stone-500 hover:bg-stone-200 hover:text-stone-900"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex h-48 items-center justify-center overflow-hidden rounded border border-stone-200 bg-white p-2">
                  <img
                    src={imageDataUrl}
                    alt="Bản xem trước tư liệu Hán Nôm"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Philological Configuration Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="doc-type-select" className="mb-1 block text-xs font-medium text-stone-700">
              Thể loại văn bản
            </label>
            <select
              id="doc-type-select"
              value={docType}
              onChange={(e) => onDocTypeChange(e.target.value as DocType)}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#9A3412] focus:outline-none"
            >
              <option value="auto">Tự động nhận diện thể loại</option>
              <option value="tho-duong">Thơ Đường luật / Hán thi</option>
              <option value="luc-bat">Truyện Nôm / Thơ Lục bát</option>
              <option value="sac-phong">Sắc phong / Chiếu chỉ</option>
              <option value="van-bia">Văn bia / Minh văn khắc đá</option>
              <option value="gia-pha">Gia phả / Tộc ước</option>
              <option value="khe-uoc">Khế ước điền thổ</option>
            </select>
          </div>

          <div>
            <label htmlFor="direction-select" className="mb-1 block text-xs font-medium text-stone-700">
              Chiều đọc chữ
            </label>
            <select
              id="direction-select"
              value={readingDirection}
              onChange={(e) => onReadingDirectionChange(e.target.value as ReadingDirection)}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#9A3412] focus:outline-none"
            >
              <option value="auto">Tự động xác định</option>
              <option value="vertical-rtl">Cột dọc từ phải sang trái</option>
              <option value="horizontal-ltr">Hàng ngang từ trái sang phải</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="extra-context-input" className="mb-1 block text-xs font-medium text-stone-700">
            Ngữ cảnh bổ sung (tùy chọn)
          </label>
          <input
            id="extra-context-input"
            type="text"
            value={extraContext}
            onChange={(e) => onExtraContextChange(e.target.value)}
            placeholder="Ví dụ: Sắc phong thời Tự Đức, lưu ý tên địa danh cổ hoặc chữ húy..."
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#9A3412] focus:outline-none"
          />
        </div>

        {/* Submit Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-stone-500">
            Hệ thống sẽ tách từng chữ, gắn độ tin cậy và liệt kê dị bản/tự dạng dễ nhầm.
          </p>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-[#9A3412] px-5 py-2.5 text-sm font-medium text-[#FBF9F5] transition-colors hover:bg-[#7C2D12] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isLoading ? 'Đang phiên âm & kiểm chứng...' : 'Phiên âm & Kiểm chứng'}</span>
          </button>
        </div>
      </div>

      {/* Quick Curated Archival Samples Strip */}
      <div className="mt-6 border-t border-stone-200 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-700">
            Nạp nhanh tư liệu mẫu
          </span>
          <span className="text-xs text-stone-500">
            Thử nghiệm cả chế độ văn bản lẫn bản khắc ảnh
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ARCHIVAL_SAMPLES.map((sample) => (
            <div
              key={sample.id}
              className="flex items-center justify-between gap-2 rounded border border-stone-200 bg-[#FBF9F5] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-stone-800">{sample.title}</p>
                <p className="truncate text-[11px] text-stone-500">{sample.scriptLabel}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleLoadSample(sample, 'text')}
                  className="cursor-pointer rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 whitespace-nowrap"
                >
                  Chữ
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample(sample, 'image')}
                  className="cursor-pointer rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-medium text-[#9A3412] hover:bg-stone-100 whitespace-nowrap"
                >
                  Bản khắc
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
