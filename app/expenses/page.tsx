'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useExpenses } from '@/hooks/useData';
import BottomNav from '@/components/BottomNav';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { MedicalExpense } from '@/types/app';

const EXPENSE_LABEL = { hospital: '病院', pharmacy: '薬局', other: 'その他' };

/** API 由来で文字列になることがあるため集計は必ず数値化 */
function expenseYen(e: MedicalExpense): number {
  const n = Number(e.total_amount);
  return Number.isFinite(n) ? n : 0;
}

function groupByMonth(expenses: MedicalExpense[] | undefined) {
  if (!expenses) return [];
  const groups: { key: string; label: string; total: number; items: MedicalExpense[] }[] = [];
  for (const e of expenses) {
    const key = e.expense_date.slice(0, 7);
    const label = format(parseISO(e.expense_date.slice(0, 7) + '-01'), 'yyyy年M月', { locale: ja });
    const yen = expenseYen(e);
    const g = groups.find((g) => g.key === key);
    if (g) { g.items.push(e); g.total += yen; }
    else { groups.push({ key, label, total: yen, items: [e] }); }
  }
  return groups;
}

export default function ExpensesPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: expenses, isLoading } = useExpenses(year);
  const groups = groupByMonth(expenses);
  const yearTotal = expenses?.reduce((s, e) => s + expenseYen(e), 0) ?? 0;
  const deductibleTotal =
    expenses?.filter((e) => e.is_deductible === true).reduce((s, e) => s + expenseYen(e), 0) ?? 0;

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900">💰 医療費</h1>
        <Link href="/expenses/new" className="w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-full text-xl font-bold">
          +
        </Link>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* 年選択 */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setYear((y) => y - 1)} className="w-8 h-8 flex items-center justify-center text-gray-400 bg-white rounded-full border border-gray-200">‹</button>
          <span className="text-sm font-semibold text-gray-900">{year}年</span>
          <button onClick={() => setYear((y) => y + 1)} disabled={year >= new Date().getFullYear()}
            className="w-8 h-8 flex items-center justify-center text-gray-400 bg-white rounded-full border border-gray-200 disabled:opacity-30">›</button>
        </div>

        {/* 年間サマリー */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500">年間合計</p>
            <p className="text-xl font-bold text-gray-900 mt-1">¥{yearTotal.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500">医療費控除対象</p>
            <p className="text-xl font-bold text-indigo-600 mt-1">¥{deductibleTotal.toLocaleString()}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-gray-500 text-sm">医療費の記録がありません</p>
            <Link href="/expenses/new" className="inline-block mt-4 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium">
              最初の記録を追加
            </Link>
            <p className="text-xs text-gray-400 mt-4 max-w-sm mx-auto leading-relaxed">
              登録直後でここが空のときは、領収書の支払日の年と、上の「◯◯年」が一致しているか確認してください。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500">{group.label}</p>
                  <p className="text-xs font-semibold text-gray-700">¥{group.total.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  {group.items.map((e) => (
                    <div key={e.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400">
                              {format(parseISO(e.expense_date), 'M/d（E）', { locale: ja })}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                              {EXPENSE_LABEL[e.expense_type]}
                            </span>
                            {e.is_deductible && (
                              <span className="text-xs bg-green-50 text-green-600 rounded-full px-2 py-0.5">控除</span>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 text-sm truncate">{e.facility_name}</p>
                          {e.member && <p className="text-xs text-gray-400">{e.member.name}</p>}
                        </div>
                        <p className="font-bold text-gray-900 ml-3">¥{expenseYen(e).toLocaleString()}</p>
                      </div>
                    </div>
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
