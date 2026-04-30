'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCheckup } from '@/hooks/useData';
import BottomNav from '@/components/BottomNav';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

const JUDGMENT_COLOR: Record<string, string> = {
  A: 'bg-green-100 text-green-700', B: 'bg-yellow-100 text-yellow-700',
  C: 'bg-orange-100 text-orange-700', D: 'bg-red-100 text-red-700', E: 'bg-purple-100 text-purple-700',
};
const TEXT_COLOR: Record<string, string> = {
  A: 'text-green-600', B: 'text-yellow-600', C: 'text-orange-500', D: 'text-red-600', E: 'text-purple-600',
};

export default function CheckupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: checkup, isLoading } = useCheckup(id);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!checkup) return <div className="p-6 text-center text-gray-500">記録が見つかりません</div>;

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-base font-bold text-gray-900">健診詳細</h1>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* 基本情報 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-bold text-gray-900">
                {checkup.facility_name ?? checkup.checkup_type ?? '健診'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {format(parseISO(checkup.checkup_date), 'yyyy年M月d日', { locale: ja })}
                {checkup.member && `　${checkup.member.name}`}
              </p>
            </div>
            {checkup.overall_judgment && (
              <span className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${JUDGMENT_COLOR[checkup.overall_judgment] ?? ''}`}>
                {checkup.overall_judgment}
              </span>
            )}
          </div>
          {checkup.checkup_type && checkup.facility_name && (
            <p className="text-xs text-gray-400">{checkup.checkup_type}</p>
          )}
        </div>

        {/* 検査結果 */}
        {checkup.checkup_items && checkup.checkup_items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">検査結果</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {checkup.checkup_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{item.item_name}</p>
                    {item.reference_range && (
                      <p className="text-xs text-gray-400">基準: {item.reference_range}</p>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {item.value != null ? item.value : '-'}
                      {item.unit && <span className="text-xs text-gray-400 ml-1">{item.unit}</span>}
                    </span>
                    {item.judgment && (
                      <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${JUDGMENT_COLOR[item.judgment] ?? ''}`}>
                        {item.judgment}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {checkup.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">メモ</h2>
            <p className="text-sm text-gray-700">{checkup.notes}</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
