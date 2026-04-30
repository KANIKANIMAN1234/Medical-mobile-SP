'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDashboard, useMembers } from '@/hooks/useData';
import { useAppStore } from '@/stores/appStore';
import BottomNav from '@/components/BottomNav';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const JUDGMENT_COLOR: Record<string, string> = {
  A: 'text-green-600', B: 'text-yellow-600', C: 'text-orange-500', D: 'text-red-600', E: 'text-purple-600',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, currentOrganization, selectedMemberId, selectedMemberName, setSelectedMember, logout } = useAppStore();
  const { data: members } = useMembers();
  const { data: dash, isLoading } = useDashboard();

  const handleLogout = async () => {
    logout();
    router.push('/');
  };

  const displayName = selectedMemberName ?? user?.display_name ?? 'メンバー';

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-900">通院記録くん</span>
        </div>
        <div className="flex items-center gap-2">
          {/* メンバー選択 */}
          <select
            value={selectedMemberId ?? ''}
            onChange={(e) => {
              const m = members?.find((m) => m.id === e.target.value);
              setSelectedMember(m ? { id: m.id, name: m.name } : null);
            }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[120px] truncate"
          >
            <option value="">全員</option>
            {members?.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <Link href="/settings" className="w-8 h-8 flex items-center justify-center text-gray-500 rounded-full bg-gray-100">
            ⚙️
          </Link>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* サマリーカード */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">今月の医療費</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              ¥{(dash?.monthly_expense ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">今年の合計</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              ¥{(dash?.yearly_expense ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">今月の通院</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {dash?.monthly_visits ?? 0}<span className="text-sm font-normal text-gray-500"> 件</span>
            </p>
          </div>
        </div>

        {/* 次回の予約 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              📅 次回の予約
            </h2>
            <Link href="/visits" className="text-xs text-indigo-600">すべて見る</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-400">読み込み中...</div>
            ) : dash?.upcoming_visits?.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">予定なし</div>
            ) : (
              dash?.upcoming_visits?.map((v) => (
                <Link key={v.id} href={`/visits/${v.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-sm flex-shrink-0">
                    📅
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {v.hospital?.name ?? v.hospital_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {v.next_visit_date} {v.department && `・${v.department}`}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* 服薬中の薬 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              💊 服薬中の薬
              {dash?.active_medications && dash.active_medications.length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {dash.active_medications.length}
                </span>
              )}
            </h2>
            <Link href="/medications" className="text-xs text-indigo-600">すべて見る</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-400">読み込み中...</div>
            ) : dash?.active_medications?.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">服薬中の薬はありません</div>
            ) : (
              dash?.active_medications?.map((med) => {
                const isEndingSoon = med.end_date
                  ? (new Date(med.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
                  : false;
                return (
                  <div key={med.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-sm flex-shrink-0">
                      💊
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{med.drug_name}</p>
                      <p className="text-xs text-gray-500">
                        {med.frequency ?? (med.is_ongoing ? '常用' : '')}
                        {isEndingSoon && <span className="ml-2 text-orange-500 font-medium">⚠️ 残り少</span>}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 最新健診 */}
        {dash?.latest_checkup && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                📊 最新健診
              </h2>
              <Link href={`/checkups/${dash.latest_checkup.id}`} className="text-xs text-indigo-600">詳細を見る</Link>
            </div>
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-500">
                {dash.latest_checkup.checkup_date}　
                <span className={`font-bold text-sm ${JUDGMENT_COLOR[dash.latest_checkup.overall_judgment ?? ''] ?? ''}`}>
                  {dash.latest_checkup.overall_judgment ?? '-'} 判定
                </span>
              </p>
              <div className="mt-2 space-y-1">
                {dash.latest_checkup.checkup_items?.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{item.item_name}</span>
                    <span className={`font-medium ${JUDGMENT_COLOR[item.judgment ?? ''] ?? 'text-gray-700'}`}>
                      {item.value} {item.unit}
                      {item.judgment && ` [${item.judgment}]`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
