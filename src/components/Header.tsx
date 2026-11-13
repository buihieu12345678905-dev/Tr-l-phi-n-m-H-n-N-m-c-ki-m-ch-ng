import React from 'react';

export type ActiveSection = 'workbench' | 'matrix' | 'samples' | 'history';

interface HeaderProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
  onNewSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onNavigate,
  onNewSession,
}) => {
  const navItems: Array<{ id: ActiveSection; label: string }> = [
    { id: 'workbench', label: 'Bàn phiên âm' },
    { id: 'matrix', label: 'Đối chiếu chữ' },
    { id: 'samples', label: 'Kho mẫu' },
    { id: 'history', label: 'Lịch sử' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#FBF9F5]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('workbench')}
          className="cursor-pointer font-serif text-xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9A3412]"
        >
          Hán Nôm Kiểm Chứng
        </button>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`cursor-pointer py-1 transition-colors duration-150 whitespace-nowrap shrink-0 border-b ${
                  isActive
                    ? 'border-[#9A3412] text-stone-900 font-semibold'
                    : 'border-transparent hover:text-stone-900 hover:border-stone-300'
                } focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9A3412]`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewSession}
            className="cursor-pointer rounded-md bg-[#9A3412] px-4 py-2 text-sm font-medium text-[#FBF9F5] transition-colors duration-150 hover:bg-[#7C2D12] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412]"
          >
            Phiên âm mới
          </button>
        </div>
      </div>
    </header>
  );
};
