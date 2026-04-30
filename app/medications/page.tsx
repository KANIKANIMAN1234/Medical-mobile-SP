'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMedications, useCreateMedication, useDeleteMedication, useMembers } from '@/hooks/useData';
import { useAppStore } from '@/stores/appStore';
import BottomNav from '@/components/BottomNav';
import type { Medication } from '@/types/app';

type Tab = 'active' | 'ended';

export default function MedicationsPage() {
  const { selectedMemberId } = useAppStore();
  const { data: allMeds, isLoading } = useMedications(false);
  const { data: members } = useMembers();
  const createMed = useCreateMedication();
  const deleteMed = useDeleteMedication();

  const [tab, setTab] = useState<Tab>('active');
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const activeMeds = allMeds?.filter((m) => m.is_ongoing || !m.end_date || m.end_date >= today) ?? [];
  const endedMeds = allMeds?.filter((m) => !m.is_ongoing && m.end_date && m.end_date < today) ?? [];
  const displayMeds = tab === 'active' ? activeMeds : endedMeds;

  // フォームState
  const { user, currentOrganization } = useAppStore();
  const [form, setForm] = useState({
    member_id: selectedMemberId ?? members?.[0]?.id ?? '',
    drug_name: '',
    dosage: '',
    frequency: '',
    prescribed_date: today,
    days_supply: '',
    is_ongoing: false,
    purpose: '',
  });

  const handleSave = async () => {
    if (!form.drug_name || !form.member_id) return;
    setSaving(true);
    try {
      await createMed.mutateAsync({
        ...form,
        days_supply: form.days_supply ? Number(form.days_supply) : undefined,
        end_date: form.days_supply && !form.is_ongoing
          ? new Date(new Date(form.prescribed_date).getTime() + Number(form.days_supply) * 86400000)
              .toISOString().split('T')[0]
          : undefined,
      });
      setShowForm(false);
      setForm({ member_id: selectedMemberId ?? '', drug_name: '', dosage: '', frequency: '', prescribed_date: today, days_supply: '', is_ongoing: false, purpose: '' });
    } catch { /* noop */ }
    setSaving(false);
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900">💊 お薬手帳</h1>
        <button
          onClick={() => setShowForm(true)}
          className="w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-full text-xl font-bold"
        >
          +
        </button>
      </header>

      {/* タブ */}
      <div className="flex bg-white border-b border-gray-200">
        {(['active', 'ended'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'
            }`}
          >
            {t === 'active' ? `服薬中 (${activeMeds.length})` : `終了済み (${endedMeds.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayMeds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💊</p>
            <p className="text-gray-500 text-sm">
              {tab === 'active' ? '服薬中の薬はありません' : '終了済みの薬はありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayMeds.map((med) => {
              const isEndingSoon = med.end_date
                ? (new Date(med.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
                : false;
              return (
                <div key={med.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{med.drug_name}</p>
                        {isEndingSoon && <span className="text-xs bg-orange-50 text-orange-500 rounded-full px-2 py-0.5">⚠️ 残り少</span>}
                        {med.is_ongoing && <span className="text-xs bg-blue-50 text-blue-500 rounded-full px-2 py-0.5">常用</span>}
                      </div>
                      {med.dosage && <p className="text-xs text-gray-500 mt-1">{med.dosage}</p>}
                      {med.frequency && <p className="text-xs text-gray-400">{med.frequency}</p>}
                      {med.end_date && <p className="text-xs text-gray-400">{med.prescribed_date} ～ {med.end_date}</p>}
                      {med.member && <p className="text-xs text-gray-400 mt-1">{med.member.name}</p>}
                    </div>
                    <button
                      onClick={() => setDeletingId(med.id)}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 flex-shrink-0"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 追加フォーム (ボトムシート) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">お薬を追加</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-lg">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">受診者 *</label>
                <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className={inputCls}>
                  <option value="">選択</option>
                  {members?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">薬品名 *</label>
                <input type="text" value={form.drug_name} onChange={(e) => setForm({ ...form, drug_name: e.target.value })}
                  placeholder="例: アムロジピン錠5mg" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">用量・用法</label>
                <input type="text" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  placeholder="例: 1錠 毎朝" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">服用頻度</label>
                <input type="text" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  placeholder="例: 毎食後" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">処方日 *</label>
                <input type="date" value={form.prescribed_date} onChange={(e) => setForm({ ...form, prescribed_date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">日数</label>
                <input type="number" value={form.days_supply} onChange={(e) => setForm({ ...form, days_supply: e.target.value })}
                  placeholder="例: 30" className={inputCls} min={1} />
              </div>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.is_ongoing}
                  onChange={(e) => setForm({ ...form, is_ongoing: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600" />
                <span className="text-sm text-gray-700">常用薬（終了日なし）</span>
              </label>
              <button onClick={handleSave} disabled={!form.drug_name || !form.member_id || saving}
                className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl text-sm mt-2">
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-3">
            <p className="text-center font-semibold text-gray-900">この薬を削除しますか？</p>
            <button onClick={async () => { await deleteMed.mutateAsync(deletingId); setDeletingId(null); }}
              className="w-full bg-red-500 text-white py-3.5 rounded-xl font-bold text-sm">削除する</button>
            <button onClick={() => setDeletingId(null)}
              className="w-full border border-gray-200 text-gray-600 py-3.5 rounded-xl text-sm">キャンセル</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
