'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateExpense, useOcrReceipt, useMembers } from '@/hooks/useData';
import { useAppStore } from '@/stores/appStore';
import BottomNav from '@/components/BottomNav';
import type { OcrReceiptResult } from '@/types/app';
import imageCompression from 'browser-image-compression';

type Phase = 'capture' | 'confirm';

export default function NewExpensePage() {
  const router = useRouter();
  const { selectedMemberId } = useAppStore();
  const { data: members } = useMembers();
  const createExpense = useCreateExpense();
  const ocrReceipt = useOcrReceipt();

  const [phase, setPhase] = useState<Phase>('capture');
  const [memberId, setMemberId] = useState(selectedMemberId ?? members?.[0]?.id ?? '');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcring, setIsOcring] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrReceiptResult | null>(null);

  // 確認フォーム
  const [facilityName, setFacilityName] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseType, setExpenseType] = useState<'hospital' | 'pharmacy' | 'other'>('hospital');
  const [totalAmount, setTotalAmount] = useState('');
  const [isDeductible, setIsDeductible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback(async (file: File) => {
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true });
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        const preview = e.target?.result as string;
        setImageBase64(base64);
        setImagePreview(preview);

        // OCR実行
        setIsOcring(true);
        setOcrProgress(0);
        const timer = setInterval(() => setOcrProgress((p) => Math.min(p + 8, 85)), 800);
        try {
          const result = await ocrReceipt.mutateAsync({ imageBase64: base64, memberId });
          setOcrResult(result);
          setFacilityName(result.facility_name ?? '');
          setExpenseDate(result.payment_date ?? new Date().toISOString().split('T')[0]);
          setExpenseType(result.expense_type ?? 'hospital');
          setTotalAmount(result.total_amount?.toString() ?? '');
          setOcrProgress(100);
          setTimeout(() => { setPhase('confirm'); setIsOcring(false); }, 500);
        } catch {
          setOcrProgress(0);
          setIsOcring(false);
          setPhase('confirm');
          setExpenseDate(new Date().toISOString().split('T')[0]);
        } finally {
          clearInterval(timer);
        }
      };
      reader.readAsDataURL(compressed);
    } catch {
      setError('画像の処理に失敗しました');
    }
  }, [memberId, ocrReceipt]);

  const handleSave = async () => {
    if (!facilityName || !totalAmount || !memberId) return;
    setSaving(true);
    try {
      await createExpense.mutateAsync({
        member_id: memberId,
        facility_name: facilityName,
        expense_date: expenseDate,
        expense_type: expenseType,
        total_amount: Number(totalAmount),
        is_deductible: isDeductible,
      });
      router.push('/expenses');
    } catch {
      setError('保存に失敗しました');
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

  if (phase === 'capture') {
    return (
      <div className="min-h-screen pb-20 bg-gray-50">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
          <h1 className="text-base font-bold text-gray-900">領収書を登録</h1>
        </header>

        <div className="px-4 py-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">受診者 *</label>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputCls}>
              <option value="">選択</option>
              {members?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {isOcring ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              {imagePreview && (
                <img src={imagePreview} alt="領収書" className="w-32 h-32 object-cover rounded-xl mx-auto mb-4" />
              )}
              <p className="text-sm font-medium text-gray-700 mb-3">⚡ 読み取り中...（10〜15秒）</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{ocrProgress}%</p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={!memberId}
                className="w-full bg-white border-2 border-indigo-200 rounded-2xl p-6 flex flex-col items-center gap-2 active:bg-indigo-50 disabled:opacity-40"
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm font-medium text-gray-700">領収書を撮影する</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!memberId}
                className="w-full bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-2 active:bg-gray-50 disabled:opacity-40"
              >
                <span className="text-3xl">🖼️</span>
                <span className="text-sm font-medium text-gray-700">アルバムから選ぶ</span>
              </button>
              <button
                onClick={() => { setPhase('confirm'); setExpenseDate(new Date().toISOString().split('T')[0]); }}
                disabled={!memberId}
                className="w-full text-sm text-gray-400 py-2"
              >
                手入力で登録する
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setPhase('capture')} className="text-gray-500 text-lg">←</button>
        <h1 className="text-base font-bold text-gray-900">内容を確認</h1>
      </header>

      <div className="px-4 py-6 space-y-4">
        {imagePreview && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <img src={imagePreview} alt="領収書" className="w-full h-40 object-cover" />
          </div>
        )}

        {ocrResult && ocrResult.confidence < 0.6 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
            ⚠️ 読み取り精度が低い可能性があります。内容をご確認ください。
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">支払日 *</label>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">病院・薬局名 *</label>
            <input type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)}
              placeholder="例: 大阪内科クリニック" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">種別</label>
            <select value={expenseType} onChange={(e) => setExpenseType(e.target.value as typeof expenseType)} className={inputCls}>
              <option value="hospital">病院</option>
              <option value="pharmacy">薬局</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">合計金額（円）*</label>
            <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="3500" className={inputCls} min={0} />
          </div>
          <label className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3">
            <input type="checkbox" checked={isDeductible} onChange={(e) => setIsDeductible(e.target.checked)}
              className="w-5 h-5 accent-indigo-600" />
            <span className="text-sm text-gray-700">医療費控除対象</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <div className="flex gap-3">
          <button onClick={() => setPhase('capture')}
            className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl text-sm">
            やり直し
          </button>
          <button onClick={handleSave}
            disabled={!facilityName || !totalAmount || !expenseDate || saving}
            className="flex-[2] bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-3.5 rounded-xl text-sm">
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
