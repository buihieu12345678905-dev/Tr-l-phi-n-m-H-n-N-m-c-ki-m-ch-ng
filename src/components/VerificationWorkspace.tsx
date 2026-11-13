import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  PenLine,
  Copy,
  Check,
  Download,
  Globe,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  GroundingCheckResult,
  HanNomToken,
  TranscriptionResult,
} from '../types/hanNom';
import {
  buildMarkdownDossier,
  downloadTextFile,
  getEffectiveChar,
  getEffectiveReading,
} from '../utils/exportUtils';

interface VerificationWorkspaceProps {
  result: TranscriptionResult;
  grounding?: GroundingCheckResult;
  selectedTokenId: string | null;
  onSelectToken: (tokenId: string) => void;
  onGroundingComplete: (grounding: GroundingCheckResult) => void;
}

type OutputTab = 'interlinear' | 'parallel' | 'plain' | 'grounding';
type TokenFilter = 'all' | 'attention' | 'manual';

export const VerificationWorkspace: React.FC<VerificationWorkspaceProps> = ({
  result,
  grounding,
  selectedTokenId,
  onSelectToken,
  onGroundingComplete,
}) => {
  const [activeTab, setActiveTab] = useState<OutputTab>('interlinear');
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all');
  const [copied, setCopied] = useState(false);
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingError, setGroundingError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const nonPunct = result.tokens.filter((t) => t.scriptType !== 'punctuation');
    const verified = nonPunct.filter((t) => t.status === 'verified').length;
    const manual = nonPunct.filter((t) => Boolean(t.manualOverride) || t.status === 'manual').length;
    const attention = nonPunct.filter(
      (t) => !t.manualOverride && (t.status === 'review' || t.status === 'uncertain')
    ).length;
    return {
      total: nonPunct.length,
      verified,
      manual,
      attention,
    };
  }, [result.tokens]);

  const tokensByLine = useMemo(() => {
    const map = new Map<number, HanNomToken[]>();
    for (const tok of result.tokens) {
      const list = map.get(tok.lineNumber) ?? [];
      list.push(tok);
      map.set(tok.lineNumber, list);
    }
    return map;
  }, [result.tokens]);

  const fullHanNomText = useMemo(
    () => result.lines.map((l) => l.hanNom).join('\n'),
    [result.lines]
  );

  const fullEffectiveQuocNgu = useMemo(() => {
    return result.lines
      .map((line) => {
        const lineToks = tokensByLine.get(line.lineNumber) ?? [];
        if (lineToks.length === 0) return line.quocNgu;
        return lineToks
          .map((t) => getEffectiveReading(t))
          .filter(Boolean)
          .join(' ')
          .replace(/\s+([,.;:!?])/g, '$1');
      })
      .join('\n');
  }, [result.lines, tokensByLine]);

  const handleCopy = async () => {
    const textToCopy = result.lines
      .map((line) => {
        const lineToks = tokensByLine.get(line.lineNumber) ?? [];
        const qn =
          lineToks.length > 0
            ? lineToks.map((t) => getEffectiveReading(t)).filter(Boolean).join(' ')
            : line.quocNgu;
        return `${line.hanNom}\n${qn}\n(${line.translation})`;
      })
      .join('\n\n');

    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleExportMarkdown = () => {
    const md = buildMarkdownDossier(result, grounding);
    downloadTextFile(
      `bien-ban-han-nom-${Date.now()}.md`,
      md,
      'text/markdown;charset=utf-8'
    );
  };

  const handleExportJson = () => {
    downloadTextFile(
      `han-nom-kiem-chung-${Date.now()}.json`,
      JSON.stringify({ result, grounding }, null, 2),
      'application/json;charset=utf-8'
    );
  };

  const handleRunGroundingCheck = async () => {
    setGroundingLoading(true);
    setGroundingError(null);
    setActiveTab('grounding');
    try {
      const res = await fetch('/api/grounding-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hanNomText: fullHanNomText,
          quocNguText: fullEffectiveQuocNgu,
          sourceGuess: result.sourceIdentification,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể đối chiếu nguồn trực tuyến.');
      }
      onGroundingComplete(data as GroundingCheckResult);
    } catch (err) {
      setGroundingError(err instanceof Error ? err.message : 'Lỗi kết nối.');
    } finally {
      setGroundingLoading(false);
    }
  };

  return (
    <div className="border border-stone-200 bg-white rounded-lg overflow-hidden">
      {/* Header Summary */}
      <div className="border-b border-stone-200 p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-2xl font-semibold text-stone-900">
              {result.title}
            </h2>
            {/* Zero-pill metadata strip with typographic separators */}
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-stone-600">
              <span>{result.detectedScript}</span>
              <span aria-hidden="true">·</span>
              <span>{result.readingDirection}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-medium text-stone-800">
                Độ tin cậy tổng thể {result.overallConfidence}%
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {stats.verified + stats.manual}/{stats.total} chữ đạt kiểm chứng
              </span>
              {stats.attention > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums font-medium text-[#B45309]">
                    {stats.attention} chữ cần đối chiếu
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Utility Export Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#14532D]" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Xuất .MD</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 whitespace-nowrap shrink-0"
            >
              <span>JSON</span>
            </button>
            <button
              type="button"
              disabled={groundingLoading}
              onClick={handleRunGroundingCheck}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded border border-[#9A3412] bg-[#9A3412] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7C2D12] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {groundingLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              <span>Đối chiếu nguồn mở</span>
            </button>
          </div>
        </div>

        {/* Philological Overview & Source Identification */}
        <div className="mt-4 border-t border-stone-100 pt-3.5 text-sm leading-relaxed text-stone-700 space-y-1.5">
          <p>
            <span className="font-semibold text-stone-900">Nhận diện xuất xứ:</span>{' '}
            {result.sourceIdentification}
          </p>
          <p className="text-stone-600">{result.summaryNote}</p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-[#FBF9F5] px-5 py-2.5">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'interlinear', label: 'Đối chiếu từng chữ' },
              { id: 'parallel', label: 'Song ngữ từng dòng' },
              { id: 'plain', label: 'Văn bản thuần' },
              { id: 'grounding', label: 'Kiểm chứng nguồn' },
            ] as Array<{ id: OutputTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'interlinear' && (
          <div className="flex items-center gap-1 rounded border border-stone-200 bg-white p-0.5">
            {(
              [
                { id: 'all', label: `Tất cả (${stats.total})` },
                { id: 'attention', label: `Cần đối chiếu (${stats.attention})` },
                { id: 'manual', label: `Đã hiệu đính (${stats.manual})` },
              ] as Array<{ id: TokenFilter; label: string }>
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTokenFilter(f.id)}
                className={`cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                  tokenFilter === f.id
                    ? 'bg-[#F3EFE6] text-stone-900 font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-5 lg:p-6">
        {activeTab === 'interlinear' && (
          <div className="space-y-6">
            {result.lines.map((line) => {
              const lineToks = (tokensByLine.get(line.lineNumber) ?? []).filter((tok) => {
                if (tokenFilter === 'all') return true;
                if (tokenFilter === 'attention') {
                  return (
                    !tok.manualOverride &&
                    (tok.status === 'review' || tok.status === 'uncertain')
                  );
                }
                return Boolean(tok.manualOverride) || tok.status === 'manual';
              });

              if (lineToks.length === 0 && tokenFilter !== 'all') {
                return null;
              }

              return (
                <div
                  key={line.lineNumber}
                  className="border-b border-stone-100 pb-5 last:border-b-0 last:pb-0"
                >
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-stone-500 tabular-nums">
                      Dòng {String(line.lineNumber).padStart(2, '0')}
                    </span>
                    <span className="text-xs italic text-stone-500">
                      {line.translation}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {lineToks.map((tok) => {
                      if (tok.scriptType === 'punctuation') {
                        return (
                          <div
                            key={tok.id}
                            className="flex flex-col items-center justify-center px-1.5 py-2 font-han text-xl text-stone-400"
                          >
                            <span>{tok.char}</span>
                          </div>
                        );
                      }

                      const isSelected = selectedTokenId === tok.id;
                      const isManual = Boolean(tok.manualOverride) || tok.status === 'manual';
                      const effectiveChar = getEffectiveChar(tok);
                      const effectiveReading = getEffectiveReading(tok);

                      let borderStyle = 'border-stone-200 bg-[#FBF9F5] hover:border-stone-400';
                      let statusIcon = <CheckCircle2 className="h-3 w-3 text-[#14532D]" />;
                      let statusText = 'Rõ';

                      if (isManual) {
                        borderStyle = 'border-[#1E3A8A]/40 bg-[#EFF6FF]/60 hover:border-[#1E3A8A]';
                        statusIcon = <PenLine className="h-3 w-3 text-[#1E3A8A]" />;
                        statusText = 'Duyệt tay';
                      } else if (tok.status === 'review') {
                        borderStyle = 'border-[#B45309]/45 bg-[#FFFBEB]/70 hover:border-[#B45309]';
                        statusIcon = <AlertTriangle className="h-3 w-3 text-[#B45309]" />;
                        statusText = 'Đối chiếu';
                      } else if (tok.status === 'uncertain') {
                        borderStyle = 'border-[#B91C1C]/45 bg-[#FEF2F2]/70 hover:border-[#B91C1C]';
                        statusIcon = <HelpCircle className="h-3 w-3 text-[#B91C1C]" />;
                        statusText = 'Nghi vấn';
                      }

                      if (isSelected) {
                        borderStyle = 'border-[#9A3412] ring-1 ring-[#9A3412] bg-white';
                      }

                      return (
                        <button
                          key={tok.id}
                          type="button"
                          onClick={() => onSelectToken(tok.id)}
                          className={`cursor-pointer flex min-w-[70px] flex-col items-center rounded border px-2.5 py-2 text-center transition-all duration-150 ${borderStyle}`}
                        >
                          <span className="font-han text-2xl font-medium text-stone-900">
                            {effectiveChar}
                          </span>
                          <span className="mt-1 text-xs font-semibold text-stone-800">
                            {effectiveReading}
                          </span>
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-stone-600 tabular-nums">
                            {statusIcon}
                            <span>{statusText}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {tokenFilter !== 'all' &&
              result.tokens.every((tok) => {
                if (tokenFilter === 'attention') {
                  return tok.manualOverride || tok.status === 'verified' || tok.scriptType === 'punctuation';
                }
                return !tok.manualOverride && tok.status !== 'manual';
              }) && (
                <p className="py-6 text-center text-sm text-stone-500">
                  Không có ký tự nào thuộc nhóm lọc này.
                </p>
              )}

            {/* Specific Verification Flags Checklist */}
            {result.verificationChecklist.length > 0 && (
              <div className="border-t border-stone-200 pt-5">
                <h3 className="font-serif text-base font-semibold text-stone-900">
                  Các điểm khuyến nghị đối chiếu thêm
                </h3>
                <ul className="mt-3 divide-y divide-stone-100 border border-stone-200 rounded-md bg-[#FBF9F5]">
                  {result.verificationChecklist.map((flag, i) => (
                    <li key={i} className="flex flex-col gap-1 px-4 py-3 text-xs sm:flex-row sm:items-baseline sm:gap-4">
                      <span className="font-mono font-semibold text-stone-700 tabular-nums shrink-0">
                        Dòng {flag.lineNumber} ·「{flag.char}」
                      </span>
                      <span className="text-stone-800">
                        {flag.issue}{' '}
                        <span className="text-stone-500">— Gợi ý: {flag.suggestion}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'parallel' && (
          <div className="divide-y divide-stone-200">
            {result.lines.map((line) => {
              const lineToks = tokensByLine.get(line.lineNumber) ?? [];
              const effectiveLineReading =
                lineToks.length > 0
                  ? lineToks
                      .map((t) => getEffectiveReading(t))
                      .filter(Boolean)
                      .join(' ')
                      .replace(/\s+([,.;:!?])/g, '$1')
                  : line.quocNgu;

              return (
                <div
                  key={line.lineNumber}
                  className="grid grid-cols-1 gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-12"
                >
                  <div className="md:col-span-1 font-mono text-xs text-stone-400 tabular-nums">
                    {String(line.lineNumber).padStart(2, '0')}
                  </div>
                  <div className="md:col-span-4 font-han text-xl leading-relaxed text-stone-900">
                    {line.hanNom}
                  </div>
                  <div className="md:col-span-7 space-y-1.5">
                    <p className="text-base font-medium text-stone-900">
                      {effectiveLineReading}
                    </p>
                    <p className="text-sm text-stone-600">{line.translation}</p>
                    {line.notes && (
                      <p className="text-xs text-stone-500">Chú giải: {line.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'plain' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded border border-stone-200 bg-[#FBF9F5] p-4">
              <h3 className="text-xs font-semibold text-stone-500">
                Nguyên văn Hán Nôm
              </h3>
              <pre className="mt-3 whitespace-pre-wrap font-han text-xl leading-loose text-stone-900">
                {fullHanNomText}
              </pre>
            </div>
            <div className="rounded border border-stone-200 bg-[#FBF9F5] p-4">
              <h3 className="text-xs font-semibold text-stone-500">
                Bản phiên âm Quốc ngữ (đã cập nhật hiệu đính)
              </h3>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-base leading-loose text-stone-900">
                {fullEffectiveQuocNgu}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'grounding' && (
          <div className="space-y-4">
            {groundingLoading ? (
              <div className="flex items-center gap-3 py-8 text-sm text-stone-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#9A3412]" />
                <span>Đang tra cứu và đối chiếu văn bản với nguồn học thuật trực tuyến...</span>
              </div>
            ) : groundingError ? (
              <div className="rounded border border-[#B91C1C]/30 bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
                {groundingError}
              </div>
            ) : grounding ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Báo cáo đối chiếu nguồn công bố</span>
                  <span className="tabular-nums">
                    Kiểm tra lúc {new Date(grounding.checkedAt).toLocaleTimeString('vi-VN')}
                  </span>
                </div>
                <div className="prose prose-stone max-w-none text-sm leading-relaxed whitespace-pre-wrap text-stone-800">
                  {grounding.summaryMarkdown}
                </div>
                {grounding.citations.length > 0 && (
                  <div className="border-t border-stone-200 pt-4">
                    <h4 className="text-xs font-semibold text-stone-700">
                      Tư liệu & liên kết trích dẫn
                    </h4>
                    <ul className="mt-2 space-y-1.5">
                      {grounding.citations.map((cite, idx) => (
                        <li key={idx}>
                          <a
                            href={cite.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9A3412] hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span>{cite.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-stone-600">
                  Chưa thực hiện kiểm chứng đối chiếu nguồn mở cho văn bản này.
                </p>
                <button
                  type="button"
                  onClick={handleRunGroundingCheck}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-[#9A3412] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C2D12]"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Bắt đầu đối chiếu nguồn trực tuyến</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
