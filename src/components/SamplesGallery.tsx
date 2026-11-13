import React, { useMemo } from 'react';
import { ARCHIVAL_SAMPLES } from '../data/samples';
import { ArchivalSample, InputMode } from '../types/hanNom';
import { renderSamplePlateToDataUrl } from '../utils/plateGenerator';

interface SamplesGalleryProps {
  onSelectSample: (sample: ArchivalSample, mode: InputMode, plateDataUrl?: string) => void;
}

export const SamplesGallery: React.FC<SamplesGalleryProps> = ({ onSelectSample }) => {
  const platePreviews = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sample of ARCHIVAL_SAMPLES) {
      map[sample.id] = renderSamplePlateToDataUrl(sample);
    }
    return map;
  }, []);

  return (
    <section className="space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <h2 className="font-serif text-2xl font-semibold text-stone-900">
          Kho tư liệu mẫu Hán Nôm
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Các mẫu bản khắc mộc bản, văn bia và văn bản chữ Nôm được chuẩn bị sẵn để kiểm thử quy trình nhận diện và kiểm chứng.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {ARCHIVAL_SAMPLES.map((sample) => {
          const plateUrl = platePreviews[sample.id];
          return (
            <article
              key={sample.id}
              className="border border-stone-200 bg-white rounded-lg overflow-hidden flex flex-col"
            >
              <div className="flex h-64 items-center justify-center bg-[#F3EFE6] p-4 border-b border-stone-200">
                {plateUrl ? (
                  <img
                    src={plateUrl}
                    alt={sample.title}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain shadow-xs"
                  />
                ) : (
                  <div className="font-han text-lg text-stone-700 whitespace-pre-line text-center">
                    {sample.hanNomText}
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-xs text-stone-500 flex items-center gap-2">
                    <span>{sample.era}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sample.scriptLabel}</span>
                  </div>
                  <h3 className="mt-1 font-serif text-xl font-semibold text-stone-900">
                    {sample.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
                    {sample.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => onSelectSample(sample, 'image', plateUrl)}
                    className="cursor-pointer rounded-md bg-[#9A3412] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C2D12] whitespace-nowrap"
                  >
                    Phiên âm từ bản khắc ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSample(sample, 'text')}
                    className="cursor-pointer rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100 whitespace-nowrap"
                  >
                    Nạp dạng văn bản
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
