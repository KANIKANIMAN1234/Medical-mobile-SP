'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckupTrends, useCheckups } from '@/hooks/useData';
import BottomNav from '@/components/BottomNav';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const JUDGMENT_COLOR: Record<string, string> = {
  A: '#16a34a', B: '#ca8a04', C: '#f97316', D: '#dc2626', E: '#9333ea',
};

export default function CheckupTrendsPage() {
  const router = useRouter();
  const { data: checkups } = useCheckups();

  const allItemNames = Array.from(
    new Set(checkups?.flatMap((c) => c.checkup_items?.map((i) => i.item_name) ?? []) ?? [])
  );

  const [selectedItem, setSelectedItem] = useState(allItemNames[0] ?? '');
  const { data: trends } = useCheckupTrends(selectedItem);

  const chartData = trends
    ?.map((t) => {
      const hc = (Array.isArray(t.health_checkup) ? t.health_checkup[0] : t.health_checkup) as { checkup_date: string } | null;
      return {
        date: hc?.checkup_date?.slice(0, 7) ?? '',
        value: t.value,
        judgment: t.judgment,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date)) ?? [];

  const latest = chartData[chartData.length - 1];
  const prev = chartData[chartData.length - 2];
  const diff = latest && prev ? ((latest.value ?? 0) - (prev.value ?? 0)) : null;

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-base font-bold text-gray-900">📊 健診トレンド</h1>
      </header>

      <div className="px-4 py-4 space-y-4">
        {allItemNames.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-500 text-sm">健診データがありません</p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">項目選択</label>
              <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none">
                {allItemNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            {chartData.length > 0 ? (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{selectedItem}</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(v) => [v ?? '-', selectedItem]}
                        labelStyle={{ fontSize: 11 }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          return (
                            <circle
                              key={`dot-${payload.date}`}
                              cx={cx} cy={cy} r={5}
                              fill={JUDGMENT_COLOR[payload.judgment] ?? '#6366f1'}
                              stroke="white" strokeWidth={2}
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {latest && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">最新値</span>
                      <span className="font-bold text-gray-900">
                        {latest.value}
                        {diff !== null && (
                          <span className={`ml-2 text-xs ${diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {diff > 0 ? `↑+${diff.toFixed(1)}` : `↓${diff.toFixed(1)}`}
                          </span>
                        )}
                      </span>
                    </div>
                    {prev && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">前回値</span>
                        <span className="text-gray-700">{prev.value}</span>
                      </div>
                    )}
                    {latest.judgment && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">判定</span>
                        <span className={`font-bold ${JUDGMENT_COLOR[latest.judgment] ? '' : ''}`}
                          style={{ color: JUDGMENT_COLOR[latest.judgment] }}>
                          {latest.judgment}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                「{selectedItem}」のデータがありません
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
