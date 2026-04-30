'use client';

import Link from 'next/link';
import { useVisits } from '@/hooks/useData';
import BottomNav from '@/components/BottomNav';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

function groupByMonth(visits: ReturnType<typeof useVisits>['data']) {
  if (!visits) return [];
  const groups: { key: string; label: string; items: typeof visits }[] = [];
  for (const v of visits) {
    const key = v.visit_date.slice(0, 7);
    const label = format(parseISO(v.visit_date + '-01'), 'yyyy年M月', { locale: ja });
    const g = groups.find((g) => g.key === key);
    if (g) { g.items.push(v); } else { groups.push({ key, label, items: [v] }); }
  }
  return groups;
}

export default function VisitsPage() {
  const { data: visits, isLoading } = useVisits();
  const groups = groupByMonth(visits);

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900">📅 通院記録</h1>
        <Link href="/visits/new" className="w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-full text-xl font-bold">
          +
        </Link>
      </header>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-gray-500 text-sm">通院記録がありません</p>
            <Link href="/visits/new" className="inline-block mt-4 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium">
              最初の記録を追加
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key}>
                <p className="text-xs font-semibold text-gray-500 mb-2">{group.label}</p>
                <div className="space-y-2">
                  {group.items.map((v) => (
                    <Link
                      key={v.id}
                      href={`/visits/${v.id}`}
                      className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400">
                              {format(parseISO(v.visit_date), 'M/d（E）', { locale: ja })}
                            </span>
                            {v.member && (
                              <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">
                                {v.member.name}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {v.hospital?.name ?? v.hospital_name ?? '病院'}
                          </p>
                          {v.department && (
                            <p className="text-xs text-gray-500 mt-0.5">{v.department}</p>
                          )}
                          {v.chief_complaint && (
                            <p className="text-xs text-gray-400 mt-1 truncate">{v.chief_complaint}</p>
                          )}
                        </div>
                        <span className="text-gray-300 ml-2">›</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
