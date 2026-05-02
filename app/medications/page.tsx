'use client';

import { useState, useRef } from 'react';
import { useMedications, useCreateMedication, useDeleteMedication, useMembers } from '@/hooks/useData';
import { useAppStore } from '@/stores/appStore';
import BottomNav from '@/components/BottomNav';
import { createClient } from '@/lib/supabase';

type Tab = 'active' | 'ended';

/** Edge Function ocr-medication のHTTPボディ */
type OcrMedicationResponse = {
  data: {
    drug_name?: string;
    dosage?: string;
    frequency?: string;
    days_supply?: number | null;
    purpose?: string;
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

  // 画像をBase64に変換
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

  // 写真アップロード→OCR処理
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

      const dateNorm = toDateInputValue(ocr.prescribed_date);
      setForm((f) => ({
        ...f,
        drug_name: ocr.drug_name?.trim() || f.drug_name,
        dosage: ocr.dosage?.trim() || f.dosage,
        frequency: ocr.frequency?.trim() || f.frequency,
        prescribed_date: dateNorm ?? f.prescribed_date,
        days_supply:
          ocr.days_supply != null && Number.isFinite(Number(ocr.days_supply))
            ? String(Number(ocr.days_supply))
            : f.days_supply,
        purpose: ocr.purpose?.trim() || f.purpose,
      }));

      const hasStructured = !!(
        ocr.drug_name?.trim() ||
        ocr.dosage?.trim() ||
        ocr.frequency?.trim() ||
        ocr.purpose?.trim() ||
        dateNorm ||
        (ocr.days_supply != null && Number.isFinite(Number(ocr.days_supply)))
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
      setOcrPreview(null);
      setOcrHint(null);
      setForm({ member_id: selectedMemberId ?? '', drug_name: '', dosage: '', frequency: '', prescribed_date: today, days_supply: '', is_ongoing: false, purpose: '' });
    } catch { /* noop */ }
    setSaving(false);
  };

  const handleOpenForm = () => {
    setOcrPreview(null);
    setOcrHint(null);
    setForm({ member_id: selectedMemberId ?? members?.[0]?.id ?? '', drug_name: '', dosage: '', frequency: '', prescribed_date: today, days_supply: '', is_ongoing: false, purpose: '' });
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
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50">
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">お薬を追加</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-lg">✕</button>
            </div>
            <div className="space-y-3">

              {/* 受診者 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">受診者 *</label>
                <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className={inputCls}>
                  <option value="">選択</option>
                  {members?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              {/* OCR写真アップロード */}
              <div className="border-2 border-dashed border-indigo-100 rounded-2xl p-4 bg-indigo-50/40">
                <p className="text-xs font-medium text-indigo-700 mb-2">📷 薬袋・処方箋・説明書の写真から自動入力</p>

                {/* プレビュー */}
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
                  📷 {ocrPreview ? '別の写真を撮影・選択' : 'カメラ・アルバムから選択'}
                </button>
                {ocrPreview && !ocrLoading && !ocrHint && (
                  <p className="text-xs text-green-600 text-center mt-2 font-medium">✓ 読み取り完了。内容を確認のうえ保存してください。</p>
                )}
                {ocrPreview && !ocrLoading && ocrHint && (
                  <p className="text-xs text-amber-700 text-center mt-2 font-medium">{ocrHint}</p>
                )}
              </div>

              {/* 薬品名 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">薬品名 *</label>
                <input type="text" value={form.drug_name} onChange={(e) => setForm({ ...form, drug_name: e.target.value })}
                  placeholder="例: アムロジピン錠5mg" className={inputCls} />
              </div>

              {/* 用量・用法 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">用量・用法</label>
                <input type="text" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  placeholder="例: 1錠 毎朝" className={inputCls} />
              </div>

              {/* 服用頻度 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">服用頻度</label>
                <input type="text" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  placeholder="例: 毎食後" className={inputCls} />
              </div>

              {/* 処方日 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">処方日</label>
                <input type="date" value={form.prescribed_date} onChange={(e) => setForm({ ...form, prescribed_date: e.target.value })} className={inputCls} />
              </div>

              {/* 日数 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">日数</label>
                <input type="number" value={form.days_supply} onChange={(e) => setForm({ ...form, days_supply: e.target.value })}
                  placeholder="例: 30" className={inputCls} min={1} />
              </div>

              {/* 用途 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">用途・効能</label>
                <input type="text" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="例: 高血圧、花粉症" className={inputCls} />
              </div>

              {/* 常用薬チェック */}
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.is_ongoing}
                  onChange={(e) => setForm({ ...form, is_ongoing: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600" />
                <span className="text-sm text-gray-700">常用薬（終了日なし）</span>
              </label>

              <button
                onClick={handleSave}
                disabled={!form.drug_name || !form.member_id || saving || ocrLoading}
                className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl text-sm mt-2"
              >
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
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
