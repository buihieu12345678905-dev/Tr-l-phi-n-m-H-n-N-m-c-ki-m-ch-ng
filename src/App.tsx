import { useEffect, useMemo, useState } from 'react';
import { ActiveSection, Header } from './components/Header';
import { InputWorkbench } from './components/InputWorkbench';
import { SpecimenViewer } from './components/SpecimenViewer';
import { VerificationWorkspace } from './components/VerificationWorkspace';
import { TokenInspectorDrawer } from './components/TokenInspectorDrawer';
import { HistoryPanel } from './components/HistoryPanel';
import { SamplesGallery } from './components/SamplesGallery';
import {
  ArchivalSample,
  DocType,
  GroundingCheckResult,
  InputMode,
  ReadingDirection,
  SavedSession,
  TranscriptionResult,
} from './types/hanNom';
import { ARCHIVAL_SAMPLES } from './data/samples';
import { renderSamplePlateToDataUrl } from './utils/plateGenerator';

const STORAGE_KEY = 'han-nom-kiem-chung-sessions-v1';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('workbench');

  // Input state
  const [mode, setMode] = useState<InputMode>('text');
  const [text, setText] = useState<string>(ARCHIVAL_SAMPLES[0].hanNomText);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imageName, setImageName] = useState<string>('');
  const [docType, setDocType] = useState<DocType>('tho-duong');
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>('vertical-rtl');
  const [extraContext, setExtraContext] = useState<string>('');

  // Output & Verification state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [grounding, setGrounding] = useState<GroundingCheckResult | undefined>(undefined);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Saved history
  const [sessions, setSessions] = useState<SavedSession[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedSession[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
    } catch {
      // Fallback without image previews if localStorage quota exceeded
      try {
        const compact = sessions.slice(0, 12).map((s) => ({ ...s, imagePreview: undefined }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
      } catch {
        // Ignore storage errors silently
      }
    }
  }, [sessions]);

  const selectedToken = useMemo(() => {
    if (!result || !selectedTokenId) return null;
    return result.tokens.find((t) => t.id === selectedTokenId) ?? null;
  }, [result, selectedTokenId]);

  const selectedTokenLineContext = useMemo(() => {
    if (!result || !selectedToken) return '';
    const line = result.lines.find((l) => l.lineNumber === selectedToken.lineNumber);
    return line ? `${line.hanNom} (${line.quocNgu})` : '';
  }, [result, selectedToken]);

  const fullTextForContext = useMemo(() => {
    if (!result) return text;
    return result.lines.map((l) => l.hanNom).join('\n');
  }, [result, text]);

  const runTranscription = async (overrideParams?: {
    mode: InputMode;
    text?: string;
    imageDataUrl?: string | null;
    imageMimeType?: string;
    docType: DocType;
    readingDirection: ReadingDirection;
  }) => {
    const activeMode = overrideParams?.mode ?? mode;
    const activeText = overrideParams?.text ?? text;
    const activeImg = overrideParams?.imageDataUrl !== undefined ? overrideParams.imageDataUrl : imageDataUrl;
    const activeMime = overrideParams?.imageMimeType ?? imageMimeType;
    const activeDocType = overrideParams?.docType ?? docType;
    const activeDirection = overrideParams?.readingDirection ?? readingDirection;

    setIsLoading(true);
    setError(null);
    setGrounding(undefined);
    setSelectedTokenId(null);

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeMode,
          text: activeMode === 'text' ? activeText : undefined,
          imageBase64: activeMode === 'image' ? activeImg : undefined,
          imageMimeType: activeMode === 'image' ? activeMime : undefined,
          docType: activeDocType,
          readingDirection: activeDirection,
          extraContext: extraContext.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Phiên âm thất bại.');
      }

      const parsed = data as TranscriptionResult;
      setResult(parsed);

      // Automatically select first flaggable token or first non-punctuation token
      const firstFlag = parsed.tokens.find(
        (t) => t.scriptType !== 'punctuation' && (t.status === 'review' || t.status === 'uncertain')
      );
      const firstToken = parsed.tokens.find((t) => t.scriptType !== 'punctuation');
      setSelectedTokenId(firstFlag?.id ?? firstToken?.id ?? null);

      const newSession: SavedSession = {
        id: `session-${Date.now()}`,
        createdAt: new Date().toISOString(),
        mode: activeMode,
        docType: activeDocType,
        inputText: activeMode === 'text' ? activeText : undefined,
        imagePreview: activeMode === 'image' && activeImg ? activeImg : undefined,
        result: parsed,
      };
      setCurrentSessionId(newSession.id);
      setSessions((prev) => [newSession, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyOverride = (
    tokenId: string,
    reading: string,
    char?: string,
    note?: string
  ) => {
    setResult((prev) => {
      if (!prev) return prev;
      const updated: TranscriptionResult = {
        ...prev,
        tokens: prev.tokens.map((t) =>
          t.id === tokenId
            ? {
                ...t,
                manualOverride: {
                  char: char || t.char,
                  reading,
                  note,
                  updatedAt: new Date().toISOString(),
                },
              }
            : t
        ),
      };
      if (currentSessionId) {
        setSessions((sPrev) =>
          sPrev.map((s) => (s.id === currentSessionId ? { ...s, result: updated } : s))
        );
      }
      return updated;
    });
  };

  const handleClearOverride = (tokenId: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      const updated: TranscriptionResult = {
        ...prev,
        tokens: prev.tokens.map((t) => {
          if (t.id !== tokenId) return t;
          const copy = { ...t };
          delete copy.manualOverride;
          return copy;
        }),
      };
      if (currentSessionId) {
        setSessions((sPrev) =>
          sPrev.map((s) => (s.id === currentSessionId ? { ...s, result: updated } : s))
        );
      }
      return updated;
    });
  };

  const handleGroundingComplete = (newGrounding: GroundingCheckResult) => {
    setGrounding(newGrounding);
    if (currentSessionId) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId ? { ...s, grounding: newGrounding } : s
        )
      );
    }
  };

  const handleNewSession = () => {
    setResult(null);
    setGrounding(undefined);
    setSelectedTokenId(null);
    setError(null);
    setCurrentSessionId(null);
    setText('');
    setImageDataUrl(null);
    setImageName('');
    setExtraContext('');
    setActiveSection('workbench');
  };

  const handleSelectSampleFromGallery = (
    sample: ArchivalSample,
    targetMode: InputMode,
    plateDataUrl?: string
  ) => {
    setDocType(sample.docType);
    setReadingDirection(sample.readingDirection);
    setActiveSection('workbench');
    if (targetMode === 'text') {
      setMode('text');
      setText(sample.hanNomText);
      runTranscription({
        mode: 'text',
        text: sample.hanNomText,
        docType: sample.docType,
        readingDirection: sample.readingDirection,
      });
    } else {
      const url = plateDataUrl || renderSamplePlateToDataUrl(sample);
      setMode('image');
      setImageDataUrl(url);
      setImageMimeType('image/png');
      setImageName(`${sample.title}.png`);
      runTranscription({
        mode: 'image',
        imageDataUrl: url,
        imageMimeType: 'image/png',
        docType: sample.docType,
        readingDirection: sample.readingDirection,
      });
    }
  };

  const handleLoadSession = (session: SavedSession) => {
    setMode(session.mode);
    setDocType(session.docType);
    if (session.inputText) setText(session.inputText);
    if (session.imagePreview) {
      setImageDataUrl(session.imagePreview);
      setImageMimeType('image/png');
      setImageName(`${session.result.title}.png`);
    } else {
      setImageDataUrl(null);
    }
    setResult(session.result);
    setGrounding(session.grounding);
    setCurrentSessionId(session.id);
    const firstTok = session.result.tokens.find((t) => t.scriptType !== 'punctuation');
    setSelectedTokenId(firstTok?.id ?? null);
    setError(null);
    setActiveSection('workbench');
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-stone-900">
      <Header
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onNewSession={handleNewSession}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8">
        {/* Compact Scholarly Masthead */}
        <div className="mb-8 border-b border-stone-200 pb-6">
          <p className="text-xs font-medium tracking-wide text-stone-500">
            Khảo chứng văn bản học · Chữ Hán & Chữ Nôm sang Quốc ngữ
          </p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl max-w-3xl">
              Trợ lý phiên âm Hán Nôm có kiểm chứng
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-stone-600">
              Nhận diện tư liệu văn bản hoặc bản khắc ảnh, chuyển âm Quốc ngữ theo ngữ cảnh và kiểm chứng từng ký tự kèm đối chiếu nguồn công bố.
            </p>
          </div>
        </div>

        {/* Mobile Secondary Section Switcher */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
          {(
            [
              { id: 'workbench', label: 'Bàn phiên âm' },
              { id: 'matrix', label: 'Đối chiếu chữ' },
              { id: 'samples', label: 'Kho mẫu' },
              { id: 'history', label: 'Lịch sử' },
            ] as Array<{ id: ActiveSection; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`cursor-pointer rounded border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                activeSection === item.id
                  ? 'border-[#9A3412] bg-[#9A3412] text-white'
                  : 'border-stone-200 bg-white text-stone-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Section 1: Main Two-Column Workbench */}
        {activeSection === 'workbench' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Input + Specimen Viewer */}
            <div className="space-y-6 lg:col-span-5">
              <InputWorkbench
                mode={mode}
                onModeChange={setMode}
                text={text}
                onTextChange={setText}
                imageDataUrl={imageDataUrl}
                imageMimeType={imageMimeType}
                imageName={imageName}
                onImageSelect={(url, mime, name) => {
                  setImageDataUrl(url);
                  setImageMimeType(mime);
                  setImageName(name);
                }}
                onClearImage={() => {
                  setImageDataUrl(null);
                  setImageName('');
                }}
                docType={docType}
                onDocTypeChange={setDocType}
                readingDirection={readingDirection}
                onReadingDirectionChange={setReadingDirection}
                extraContext={extraContext}
                onExtraContextChange={setExtraContext}
                onSubmit={() => runTranscription()}
                isLoading={isLoading}
              />

              {mode === 'image' && imageDataUrl && (
                <SpecimenViewer
                  imageUrl={imageDataUrl}
                  caption={imageName || 'Bản ảnh đối chiếu'}
                />
              )}
            </div>

            {/* Right Column: Verified Transcription Result + Token Inspector */}
            <div className="space-y-6 lg:col-span-7">
              {error && (
                <div className="rounded-lg border border-[#B91C1C]/40 bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
                  <p className="font-semibold">Không thể hoàn tất phiên âm</p>
                  <p className="mt-1">{error}</p>
                </div>
              )}

              {isLoading && (
                <div className="border border-stone-200 bg-white rounded-lg p-6 space-y-5">
                  <div className="space-y-2">
                    <div className="h-6 w-2/3 animate-pulse rounded bg-stone-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-stone-100" />
                  </div>
                  <div className="border-t border-stone-100 pt-4 grid grid-cols-5 gap-2 sm:grid-cols-7">
                    {Array.from({ length: 14 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-20 animate-pulse rounded border border-stone-200 bg-[#FBF9F5]"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-stone-500">
                    Đang phân tích mặt chữ, xác định âm Hán-Việt/Nôm theo ngữ cảnh và kiểm chứng từng ký tự...
                  </p>
                </div>
              )}

              {!isLoading && !result && (
                <div className="border border-stone-200 bg-white rounded-lg p-8 lg:p-10 space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-stone-900">
                      Quy trình kiểm chứng ba lớp
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">
                      Khác với dịch máy thông thường, trợ lý tách riêng từng ký tự Hán Nôm để hiển thị độ tin cậy, phương án đọc thay thế và cho phép hiệu đính trực tiếp.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t border-stone-200 pt-5 sm:grid-cols-3">
                    <div>
                      <p className="font-mono text-xs font-medium text-[#9A3412] tabular-nums">
                        01. Trích xuất mặt chữ
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600">
                        Nhận diện cột dọc phải sang trái hoặc hàng ngang trên mộc bản, văn bia, sắc phong.
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-medium text-[#9A3412] tabular-nums">
                        02. Kiểm chứng từng chữ
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600">
                        Đánh dấu chữ đa âm, chữ Nôm giả tá hoặc nét khắc mờ kèm tự dạng dễ nhầm.
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-medium text-[#9A3412] tabular-nums">
                        03. Đối chiếu & Xuất bản
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600">
                        Tra cứu đối chiếu nguồn công bố trực tuyến và xuất biên bản Markdown hoặc JSON.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-stone-200 pt-5 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-stone-500">
                      Văn bản mẫu đã sẵn sàng trong ô nhập bên trái.
                    </span>
                    <button
                      type="button"
                      onClick={() => runTranscription()}
                      className="cursor-pointer rounded-md border border-[#9A3412] bg-[#9A3412] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C2D12] whitespace-nowrap"
                    >
                      Chạy thử mẫu hiện tại
                    </button>
                  </div>
                </div>
              )}

              {!isLoading && result && (
                <>
                  <VerificationWorkspace
                    result={result}
                    grounding={grounding}
                    selectedTokenId={selectedTokenId}
                    onSelectToken={setSelectedTokenId}
                    onGroundingComplete={handleGroundingComplete}
                  />
                  <TokenInspectorDrawer
                    token={selectedToken}
                    fullText={fullTextForContext}
                    lineContext={selectedTokenLineContext}
                    onClose={() => setSelectedTokenId(null)}
                    onApplyOverride={handleApplyOverride}
                    onClearOverride={handleClearOverride}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Dedicated Character-by-Character Deep Inspection View */}
        {activeSection === 'matrix' && (
          <div className="space-y-6">
            {!result ? (
              <div className="border border-stone-200 bg-white rounded-lg p-10 text-center space-y-4">
                <h2 className="font-serif text-xl font-semibold text-stone-900">
                  Chưa có văn bản đang mở để đối chiếu từng chữ
                </h2>
                <p className="text-sm text-stone-600">
                  Hãy thực hiện phiên âm từ Bàn phiên âm hoặc chọn một tư liệu từ Kho mẫu để mở bảng khảo chứng từng ký tự.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('workbench')}
                    className="cursor-pointer rounded-md bg-[#9A3412] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C2D12]"
                  >
                    Về Bàn phiên âm
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('samples')}
                    className="cursor-pointer rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100"
                  >
                    Xem Kho mẫu
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-8 space-y-6">
                  <VerificationWorkspace
                    result={result}
                    grounding={grounding}
                    selectedTokenId={selectedTokenId}
                    onSelectToken={setSelectedTokenId}
                    onGroundingComplete={handleGroundingComplete}
                  />
                </div>
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                  <TokenInspectorDrawer
                    token={selectedToken}
                    fullText={fullTextForContext}
                    lineContext={selectedTokenLineContext}
                    onClose={() => setSelectedTokenId(null)}
                    onApplyOverride={handleApplyOverride}
                    onClearOverride={handleClearOverride}
                  />
                  {mode === 'image' && imageDataUrl && (
                    <SpecimenViewer
                      imageUrl={imageDataUrl}
                      caption={imageName || 'Bản ảnh gốc'}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Curated Samples Gallery */}
        {activeSection === 'samples' && (
          <SamplesGallery onSelectSample={handleSelectSampleFromGallery} />
        )}

        {/* Section 4: Session History */}
        {activeSection === 'history' && (
          <HistoryPanel
            sessions={sessions}
            onLoadSession={handleLoadSession}
            onDeleteSession={handleDeleteSession}
          />
        )}
      </main>

      <footer className="border-t border-stone-200 bg-[#FBF9F5] py-5 px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
          <span>Hán Nôm Kiểm Chứng · Công cụ hỗ trợ phiên âm và đối chiếu văn bản học</span>
          <span>Khuyến nghị đối chiếu bản khắc gốc với các ký tự được đánh dấu cần kiểm tra</span>
        </div>
      </footer>
    </div>
  );
}
