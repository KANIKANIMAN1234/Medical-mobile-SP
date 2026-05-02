'use client';

import { useState, useRef, useCallback } from 'react';
import { useMedications, useCreateMedication, useDeleteMedication, useMembers } from '@/hooks/useData';
import { useAppStore } from '@/stores/appStore';
import BottomNav from '@/components/BottomNav';
import { createClient } from '@/lib/supabase';

type Tab = 'active' | 'ended';

const SLOT_COUNT = 3 as const;

type MedRow = {
  drug_name: string;
  dosage: string;
  frequency: string;
  days_supply: string;
  purpose: string;
  is_ongoing: boolean;
};

function emptyRow(): MedRow {
  return {
    drug_name: '',
    dosage: '',
    frequency: '',
    days_supply: '',
    purpose: '',
    is_ongoing: false,
  };
}

function initialRows(): MedRow[] {
  return Array.from({ length: SLOT_COUNT }, emptyRow);
}

/** Edge Function ocr-medication のHTTPボディ */
type OcrMedicationResponse = {
  data: {
    items?: Array<{
      drug_name?: string;
      dosage?: string;
      frequency?: string;
      days_supply?: number | null;
      purpose?: string;
    }>;
    prescribed_date?: string | null;
    ocr_raw_text?: string;
  } | null;
  error: string | null;
};

function toDateInputValue(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return undefined;
}

export default function MedicationsPage() {
  const { selectedMemberId } = useAppStore();
  const { data: allMeds, isLoading } = useMedications(false);
  const { data: members } = useMembers();
  const createMed = useCreateMedication();
  const deleteMed = useDeleteMedication();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>('active');
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split('T')[0];
  const activeMeds = allMeds?.filter((m) => m.is_ongoing || !m.end_date || m.end_date >= today) ?? [];
  const endedMeds = allMeds?.filter((m) => !m.is_ongoing && m.end_date && m.end_date < today) ?? [];
  const displayMeds = tab === 'active' ? activeMeds : endedMeds;

  const { user, currentOrganization } = useAppStore();
  const [memberId, setMemberId] = useState('');
  const [prescribedDate, setPrescribedDate] = useState(today);
  const [rows, setRows] = useState<MedRow[]>(initialRows);

  const updateRow = useCallback((index: number, patch: Partial<MedRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrPreview(URL.createObjectURL(file));
    setOcrLoading(true);
    setOcrHint(null);

    try {
      const base64 = await toBase64(file);
      const { data: raw, error } = await supabase.functions.invoke<OcrMedicationResponse>('ocr-medication', {
        body: { image_base64: base64 },
      });
      if (error) throw error;

      const payload = raw as OcrMedicationResponse | null;
      if (payload?.error) throw new Error(payload.error);
      const ocr = payload?.data;
      if (!ocr) throw new Error('レスポンスにデータがありません');

      const items = ocr.items ?? [];
      const dateNorm = toDateInputValue(ocr.prescribed_date);
      if (dateNorm) setPrescribedDate(dateNorm);

      setRows((prev) => {
        const next = prev.map((r) => ({ ...r }));
        for (let i = 0; i < SLOT_COUNT && i < items.length; i++) {
          const it = items[i];
          next[i] = {
            ...next[i],
            drug_name: it.drug_name?.trim() || next[i].drug_name,
            dosage: it.dosage?.trim() || next[i].dosage,
            frequency: it.frequency?.trim() || next[i].frequency,
            days_supply:
              it.days_supply != null && Number.isFinite(Number(it.days_supply))
                ? String(Number(it.days_supply))
                : next[i].days_supply,
            purpose: it.purpose?.trim() || next[i].purpose,
          };
        }
        return next;
      });

      const hasStructured = items.some(
        (it) =>
          it.drug_name?.trim() ||
          it.dosage?.trim() ||
          it.frequency?.trim() ||
          it.purpose?.trim() ||
          (it.days_supply != null && Number.isFinite(Number(it.days_supply)))
      );
      const rawLen = (ocr.ocr_raw_text ?? '').trim().length;
      if (!hasStructured && rawLen === 0) {
        setOcrHint('画像から文字を検出できませんでした。明るい場所で撮り直すか手入力してください。');
      } else if (!hasStructured && rawLen > 0) {
        setOcrHint('文字は読み取りましたが薬情報を特定できませんでした。手入力で補完してください。');
      } else {
        setOcrHint(null);
      }
    } catch (err) {
      console.error('OCR failed:', err);
      alert(`OCR処理に失敗しました。手動で入力してください。\n${err instanceof Error ? err.message : ''}`);
    } finally {
      setOcrLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const filledRowCount = rows.filter((r) => r.drug_name.trim()).length;

  const handleSave = async () => {
    if (!memberId || filledRowCount === 0) return;
    setSaving(true);
    try {
      for (const row of rows) {
        if (!row.drug_name.trim()) continue;
        const ds = row.days_supply ? Number(row.days_supply) : undefined;
        await createMed.mutateAsync({
          member_id: memberId,
          drug_name: row.drug_name.trim(),
          dosage: row.dosage || undefined,
          frequency: row.frequency || undefined,
          prescribed_date: prescribedDate,
          days_supply: ds,
          end_date:
            ds && !row.is_ongoing
              ? new Date(new Date(prescribedDate).getTime() + ds * 86400000).toISOString().split('T')[0]
              : undefined,
          purpose: row.purpose || undefined,
          is_ongoing: row.is_ongoing,
        });
      }
      setShowForm(false);
      setOcrPreview(null);
      setOcrHint(null);
      setRows(initialRows());
      setPrescribedDate(today);
      setMemberId('');
    } catch { /* noop */ }
    setSaving(false);
  };

  const handleOpenForm = () => {
    setOcrPreview(null);
    setOcrHint(null);
    setRows(initialRows());
    setPrescribedDate(today);
    setMemberId(selectedMemberId ?? members?.[0]?.id ?? '');
    setShowForm(true);
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900">💊 お薬手帳</h1>
        <button
          onClick={handleOpenForm}
          className="w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-full text-xl font-bold"
        >
          +
        </button>
      </header>

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

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50">
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">お薬を追加（最大{SLOT_COUNT}件）</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-lg">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">薬品名が入っている行だけ保存されます。写真は1枚で複数薬を読み取ると自動で振り分けます。</p>
            <div className="space-y-4">

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">受診者 *</label>
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputCls}>
                  <option value="">選択</option>
                  {members?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">処方日（共通）</label>
                <input
                  type="date"
                  value={prescribedDate}
                  onChange={(e) => setPrescribedDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="border-2 border-dashed border-indigo-100 rounded-2xl p-4 bg-indigo-50/40">
                <p className="text-xs font-medium text-indigo-700 mb-2">📷 写真から自動入力（最大{SLOT_COUNT}件に分配）</p>
                {ocrPreview && (
                  <div className="mb-3 relative rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ocrPreview} alt="OCR preview" className="w-full max-h-36 object-contain bg-gray-100" />
                    {ocrLoading && (
                      <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
                        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-indigo-600 font-medium">読み取り中...</span>
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-indigo-200 rounded-xl text-sm text-indigo-600 bg-white font-medium active:bg-indigo-50 disabled:opacity-50"
                >
                  📷 {ocrPreview ? '別の写真を選択' : 'カメラ・アルバムから選択'}
                </button>
                {ocrPreview && !ocrLoading && !ocrHint && (
                  <p className="text-xs text-green-600 text-center mt-2 font-medium">✓ 読み取り完了。内容を確認のうえ保存してください。</p>
                )}
                {ocrPreview && !ocrLoading && ocrHint && (
                  <p className="text-xs text-amber-700 text-center mt-2 font-medium">{ocrHint}</p>
                )}
              </div>

              {rows.map((row, idx) => (
                <div key={idx} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-700">お薬 {idx + 1}</p>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">薬品名 {idx === 0 ? '*' : ''}</label>
                    <input
                      type="text"
                      value={row.drug_name}
                      onChange={(e) => updateRow(idx, { drug_name: e.target.value })}
                      placeholder="例: アムロジピン錠5mg"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">用量・用法</label>
                    <input
                      type="text"
                      value={row.dosage}
                      onChange={(e) => updateRow(idx, { dosage: e.target.value })}
                      placeholder="例: 1錠 毎朝"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">服用頻度</label>
                    <input
                      type="text"
                      value={row.frequency}
                      onChange={(e) => updateRow(idx, { frequency: e.target.value })}
                      placeholder="例: 毎食後"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">日数</label>
                    <input
                      type="number"
                      value={row.days_supply}
                      onChange={(e) => updateRow(idx, { days_supply: e.target.value })}
                      placeholder="例: 30"
                      className={inputCls}
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">用途・効能</label>
                    <input
                      type="text"
                      value={row.purpose}
                      onChange={(e) => updateRow(idx, { purpose: e.target.value })}
                      placeholder="例: 高血圧"
                      className={inputCls}
                    />
                  </div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={row.is_ongoing}
                      onChange={(e) => updateRow(idx, { is_ongoing: e.target.checked })}
                      className="w-5 h-5 accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">常用薬（終了日なし）</span>
                  </label>
                </div>
              ))}

              <button
                onClick={handleSave}
                disabled={!memberId || filledRowCount === 0 || saving || ocrLoading}
                className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl text-sm"
              >
                {saving ? '保存中...' : filledRowCount > 1 ? `${filledRowCount}件をまとめて保存` : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50">
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
