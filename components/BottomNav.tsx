'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',   icon: '🏠', label: 'ホーム' },
  { href: '/visits',      icon: '📅', label: '通院' },
  { href: '/medications', icon: '💊', label: 'お薬' },
  { href: '/expenses',    icon: '💰', label: '医療費' },
  { href: '/checkups',    icon: '📊', label: '健診' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-indigo-600 rounded-t-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
