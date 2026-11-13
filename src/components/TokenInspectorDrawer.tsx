import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  PenLine,
  SearchCheck,
  Loader2,
  X,
} from 'lucide-react';
import { HanNomToken, TokenDeepCheckResult, VerificationStatus } from '../types/hanNom';
import { getEffectiveChar, getEffectiveReading } from '../utils/exportUtils';

interface TokenInspectorDrawerProps {
  token: HanNomToken | null;
  fullText: string;
  lineContext: string;
  onClose: () => void;
  onApplyOverride: (tokenId: string, reading: string, char?: string, note?: string) => void;
  onClearOverride: (tokenId: string) => void;
}

const SCRIPT_LABELS: Record<string, string> = {
  han: 'Chữ Hán',
  nom: 'Chữ Nôm',
  variant: 'Chữ Dị thể / Cổ tự',
  punctuation: 'Dấu câu',
};

export function renderStatusBadge(status: VerificationStatus, confidence: number) {
  if (status === 'manual') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E3A8A]">
        <PenLine className="h-3.5 w-3.5" />
        <span>Đã duyệt thủ công</span>
      </span>
    );
  }
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#14532D]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Đã kiểm chứng ({confidence}%)</span>
      </span>
    );
  }
  if (status === 'review') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Cần đối chiếu ({confidence}%)</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]">
      <HelpCircle className="h-3.5 w-3.5" />
      <span>Nghi vấn nét/âm ({confidence}%)</span>
    </span>
  );
}

export const TokenInspectorDrawer: React.FC<TokenInspectorDrawerProps> = ({
  token,
  fullText,
  lineContext,
  onClose,
  onApplyOverride,
  onClearOverride,
}) => {
  const [editReading, setEditReading] = useState('');
  const [editChar, setEditChar] = useState('');
  const [editNote, setEditNote] = useState('');
  const [question, setQuestion] = useState('');
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  const [deepResult, setDeepResult] = useState<TokenDeepCheckResult | null>(null);

  useEffect(() => {
    if (token) {
      setEditReading(getEffectiveReading(token));
      setEditChar(getEffectiveChar(token));
      setEditNote(token.manualOverride?.note ?? '');
      setQuestion('');
      setDeepError(null);
      setDeepResult(null);
    }
  }, [token?.id]);

  if (!token) {
    return (
      <aside className="border border-stone-200 bg-white rounded-lg p-6">
        <h3 className="font-serif text-lg font-semibold text-stone-900">
          Khảo chứng từng chữ
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Bấm vào bất kỳ ký tự nào trong bảng đối chiếu để xem phân tích bộ thủ, tự dạng dễ nhầm, các âm đọc thay thế hoặc thực hiện hiệu đính thủ công.
        </p>
      </aside>
    );
  }

  const effectiveChar = getEffectiveChar(token);
  const effectiveReading = getEffectiveReading(token);

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReading.trim()) return;
    onApplyOverride(
      token.id,
      editReading.trim(),
      editChar.trim() || token.char,
      editNote.trim() || undefined
    );
  };

  const handleDeepCheck = async () => {
    setDeepLoading(true);
    setDeepError(null);
    try {
      const res = await fetch('/api/reverify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullText,
          targetChar: effectiveChar,
          currentReading: effectiveReading,
          lineContext,
          userQuestion: question.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể kiểm chứng lại ký tự.');
      }
      setDeepResult(data as TokenDeepCheckResult);
    } catch (err) {
      setDeepError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.');
    } finally {
      setDeepLoading(false);
    }
  };

  return (
    <aside className="border border-stone-200 bg-white rounded-lg p-5 lg:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-stone-200 bg-[#FBF9F5] font-han text-4xl font-semibold text-stone-900">
            {effectiveChar}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span>Dòng {token.lineNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{SCRIPT_LABELS[token.scriptType] ?? 'Hán Nôm'}</span>
            </div>
            <p className="mt-1 font-serif text-2xl font-semibold text-stone-900">
              {effectiveReading}
            </p>
            <div className="mt-1">
              {renderStatusBadge(
                token.manualOverride ? 'manual' : token.status,
                token.confidence
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng khung khảo chứng"
          className="cursor-pointer rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Philological Notes */}
      <div className="space-y-3 text-sm">
        <div>
          <h4 className="text-xs font-semibold text-stone-500">
            Cấu tạo chữ & Từ nguyên
          </h4>
          <p className="mt-1 leading-relaxed text-stone-800">{token.etymologyNote}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-stone-500">
            Căn cứ kiểm chứng ngữ cảnh
          </h4>
          <p className="mt-1 leading-relaxed text-stone-700">{token.verificationBasis}</p>
        </div>

        {token.alternatives.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-stone-500">
              Âm đọc thay thế (bấm để chọn nhanh)
            </h4>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {token.alternatives.map((alt) => (
                <button
                  key={alt}
                  type="button"
                  onClick={() => {
                    setEditReading(alt);
                    onApplyOverride(token.id, alt, effectiveChar, 'Chọn từ phương án âm đọc thay thế');
                  }}
                  className="cursor-pointer rounded border border-stone-300 bg-[#FBF9F5] px-2.5 py-1 text-xs font-medium text-stone-800 hover:border-[#9A3412] hover:text-[#9A3412] whitespace-nowrap"
                >
                  {alt}
                </button>
              ))}
            </div>
          </div>
        )}

        {token.similarForms.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-stone-500">
              Tự dạng dễ nhầm lẫn khi đọc bản khắc
            </h4>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {token.similarForms.map((sim) => (
                <button
                  key={sim}
                  type="button"
                  onClick={() => setEditChar(sim)}
                  title="Thử thay mặt chữ này vào ô hiệu đính"
                  className="cursor-pointer rounded border border-stone-200 bg-[#F3EFE6] px-2.5 py-1 font-han text-base text-stone-900 hover:border-[#9A3412]"
                >
                  {sim}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deep Re-verification Request */}
      <div className="border-t border-stone-200 pt-4 space-y-2.5">
        <h4 className="text-xs font-semibold text-stone-700">
          Kiểm chứng chuyên sâu chữ「{effectiveChar}」
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Nêu nghi vấn (vd: Có phải chữ húy hay dị thể không?)"
            className="min-w-0 flex-1 rounded border border-stone-300 bg-[#FBF9F5] px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#9A3412] focus:outline-none"
          />
          <button
            type="button"
            disabled={deepLoading}
            onClick={handleDeepCheck}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded border border-stone-900 bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {deepLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SearchCheck className="h-3.5 w-3.5" />
            )}
            <span>Khảo chứng</span>
          </button>
        </div>

        {deepError && (
          <p className="text-xs text-[#B91C1C]">{deepError}</p>
        )}

        {deepResult && (
          <div className="rounded border border-stone-200 bg-[#FBF9F5] p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-stone-900">
                Đề xuất: {deepResult.recommendedReading}
              </span>
              <span className="font-mono text-stone-600 tabular-nums">
                Tin cậy {deepResult.updatedConfidence}%
              </span>
            </div>
            <p className="text-stone-700 leading-relaxed">
              <span className="font-medium text-stone-900">Bộ thủ & cấu tạo:</span>{' '}
              {deepResult.radicalAnalysis}
            </p>
            <p className="text-stone-700 leading-relaxed">
              <span className="font-medium text-stone-900">Lý giải ngữ cảnh:</span>{' '}
              {deepResult.contextualReasoning}
            </p>
            {deepResult.similarConfusableChars.length > 0 && (
              <div className="pt-1">
                <span className="font-medium text-stone-900">Phân biệt chữ gần nét:</span>
                <ul className="mt-1 space-y-1 text-stone-700">
                  {deepResult.similarConfusableChars.map((item, i) => (
                    <li key={i}>
                      <span className="font-han text-sm font-semibold text-stone-900">
                        {item.char}
                      </span>{' '}
                      ({item.reading}): {item.difference}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setEditReading(deepResult.recommendedReading);
                onApplyOverride(
                  token.id,
                  deepResult.recommendedReading,
                  deepResult.char || effectiveChar,
                  'Áp dụng sau khảo chứng chuyên sâu'
                );
              }}
              className="cursor-pointer mt-1 rounded border border-[#9A3412] bg-white px-2.5 py-1 text-xs font-medium text-[#9A3412] hover:bg-[#9A3412] hover:text-white transition-colors"
            >
              Áp dụng âm đọc「{deepResult.recommendedReading}」
            </button>
          </div>
        )}
      </div>

      {/* Manual Scholar Override Form */}
      <form onSubmit={handleSaveManual} className="border-t border-stone-200 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-stone-700">
            Hiệu đính thủ công
          </h4>
          {token.manualOverride && (
            <button
              type="button"
              onClick={() => onClearOverride(token.id)}
              className="cursor-pointer text-xs text-stone-500 hover:text-stone-900 hover:underline"
            >
              Khôi phục bản gốc AI
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[11px] text-stone-500">Mặt chữ</label>
            <input
              type="text"
              value={editChar}
              onChange={(e) => setEditChar(e.target.value)}
              className="font-han w-full rounded border border-stone-300 bg-white px-2.5 py-1.5 text-center text-base text-stone-900 focus:border-[#9A3412] focus:outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[11px] text-stone-500">Âm Quốc ngữ</label>
            <input
              type="text"
              value={editReading}
              onChange={(e) => setEditReading(e.target.value)}
              className="w-full rounded border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 focus:border-[#9A3412] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-stone-500">
            Ghi chú khảo chứng (tùy chọn)
          </label>
          <input
            type="text"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Ví dụ: Đối chiếu theo bản khắc Liễu Chàng..."
            className="w-full rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-[#9A3412] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="cursor-pointer w-full rounded-md bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 transition-colors"
        >
          Lưu hiệu đính & Đánh dấu đã duyệt
        </button>
      </form>
    </aside>
  );
};
