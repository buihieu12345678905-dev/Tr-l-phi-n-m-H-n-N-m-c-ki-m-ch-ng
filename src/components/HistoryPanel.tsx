import React from 'react';
import { Trash2, ArrowRight } from 'lucide-react';
import { SavedSession } from '../types/hanNom';

interface HistoryPanelProps {
  sessions: SavedSession[];
  onLoadSession: (session: SavedSession) => void;
  onDeleteSession: (id: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  sessions,
  onLoadSession,
  onDeleteSession,
}) => {
  if (sessions.length === 0) {
    return (
      <section className="border border-stone-200 bg-white rounded-lg p-10 text-center">
        <h2 className="font-serif text-xl font-semibold text-stone-900">
          Chưa có hồ sơ phiên âm nào được lưu
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Mỗi lần phiên âm thành công sẽ được lưu tự động tại trình duyệt để bạn đối chiếu và chỉnh sửa lại bất cứ lúc nào.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-stone-200 bg-white rounded-lg overflow-hidden">
      <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-stone-900">
            Lịch sử phiên âm & kiểm chứng
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
            {sessions.length} văn bản đã lưu trong phiên làm việc
          </p>
        </div>
      </div>

      <div className="divide-y divide-stone-200">
        {sessions.map((session) => {
          const totalTokens = session.result.tokens.filter(
            (t) => t.scriptType !== 'punctuation'
          ).length;

          return (
            <div
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-[#FBF9F5] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-lg font-medium text-stone-900 truncate">
                  {session.result.title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span>{session.result.detectedScript}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{totalTokens} chữ</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Tin cậy {session.result.overallConfidence}%
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {new Date(session.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onLoadSession(session)}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:border-[#9A3412] hover:text-[#9A3412] whitespace-nowrap"
                >
                  <span>Mở lại hồ sơ</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSession(session.id)}
                  aria-label="Xóa hồ sơ"
                  className="cursor-pointer rounded border border-stone-200 p-1.5 text-stone-400 hover:bg-stone-100 hover:text-[#B91C1C]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
