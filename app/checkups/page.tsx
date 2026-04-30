'use client';

import Link from 'next/link';
import { useCheckups } from '@/hooks/useData';
import BottomNav from '@/components/BottomNav';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

const JUDGMENT_COLOR: Record<string, string> = {
  A: 'bg-green-100 text-green-700', B: 'bg-yellow-100 text-yellow-700',
  C: 'bg-orange-100 text-orange-700', D: 'bg-red-100 text-red-700', E: 'bg-purple-100 text-purple-700',
};

export default function CheckupsPage() {
  const { data: checkups, isLoading } = useCheckups();

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900">📊 健診記録</h1>
        <div className="flex items-center gap-2">
          <Link href="/checkups/trends" className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-2 py-1.5">
            トレンド
          </Link>
          <Link href="/checkups/new" className="w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-full text-xl font-bold">
            +
          </Link>
        </div>
      </header>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !checkups?.length ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-500 text-sm">健診記録がありません</p>
            <Link href="/checkups/new" className="inline-block mt-4 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium">
              最初の記録を追加
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {checkups.map((c) => (
              <Link key={c.id} href={`/checkups/${c.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-400">
                        {format(parseISO(c.checkup_date), 'yyyy年M月d日', { locale: ja })}
                      </p>
                      {c.member && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">{c.member.name}</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {c.facility_name ?? (c.checkup_type ?? '健診')}
                    </p>
                    {c.checkup_type && c.facility_name && (
                      <p className="text-xs text-gray-400">{c.checkup_type}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {c.overall_judgment && (
                      <span className={`text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center ${JUDGMENT_COLOR[c.overall_judgment] ?? ''}`}>
                        {c.overall_judgment}
                      </span>
                    )}
                    <span className="text-gray-300">›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
