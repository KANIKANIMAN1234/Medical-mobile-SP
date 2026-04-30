'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateCheckup, useOcrCheckup, useMembers } from '@/hooks/useData';
import { useAppStore } from '@/stores/appStore';
import BottomNav from '@/components/BottomNav';
import type { OcrCheckupResult, CheckupItem, JudgmentLevel } from '@/types/app';
import imageCompression from 'browser-image-compression';

const JUDGMENT_OPTS: JudgmentLevel[] = ['A', 'B', 'C', 'D', 'E'];
const JUDGMENT_COLOR: Record<string, string> = {
  A: 'text-green-600', B: 'text-yellow-600', C: 'text-orange-500', D: 'text-red-600', E: 'text-purple-600',
};

export default function NewCheckupPage() {
  const router = useRouter();
  const { selectedMemberId } = useAppStore();
  const { data: members } = useMembers();
  const createCheckup = useCreateCheckup();
  const ocrCheckup = useOcrCheckup();

  const [phase, setPhase] = useState<'input' | 'ocr' | 'confirm'>('input');
  const [memberId, setMemberId] = useState(selectedMemberId ?? members?.[0]?.id ?? '');
  const [checkupDate, setCheckupDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkupType, setCheckupType] = useState('定期健診');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageBase64List, setImageBase64List] = useState<string[]>([]);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OcrCheckupResult | null>(null);
  const [facilityName, setFacilityName] = useState('');
  const [overallJudgment, setOverallJudgment] = useState<JudgmentLevel | ''>('');
  const [items, setItems] = useState<Partial<CheckupItem>[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageAdd = useCallback(async (file: File) => {
    const compressed = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true });
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const b64 = dataUrl.split(',')[1];
      setImagePreviews((p) => [...p, dataUrl]);
      setImageBase64List((l) => [...l, b64]);
    };
    reader.readAsDataURL(compressed);
  }, []);

  const handleOcr = async () => {
    if (!imageBase64List.length) return;
    setPhase('ocr');
    setOcrProgress(0);
    const timer = setInterval(() => setOcrProgress((p) => Math.min(p + 6, 85)), 1000);
    try {
      const result = await ocrCheckup.mutateAsync({ imagesBase64: imageBase64List });
      setOcrResult(result);
      setFacilityName(result.facility_name ?? '');
      if (result.checkup_date) setCheckupDate(result.checkup_date);
      setOverallJudgment(result.overall_judgment ?? '');
      setItems(result.items.map((item, i) => ({ ...item, id: String(i) })));
      setOcrProgress(100);
      setTimeout(() => setPhase('confirm'), 500);
    } catch {
      setPhase('confirm');
    } finally {
      clearInterval(timer);
    }
  };

  const handleSave = async () => {
    if (!memberId || !checkupDate) return;
    setSaving(true);
    try {
      await createCheckup.mutateAsync({
        checkup: {
          member_id: memberId,
          checkup_date: checkupDate,
          checkup_type: checkupType || undefined,
          facility_name: facilityName || undefined,
          overall_judgment: (overallJudgment as JudgmentLevel) || undefined,
        },
        items: items.filter((i) => i.item_name) as CheckupItem[],
      });
      router.push('/checkups');
    } catch {
      setError('保存に失敗しました');
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

  if (phase === 'ocr') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center w-full">
          <p className="text-lg mb-6">⚡ OCRで読み取り中...</p>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${ocrProgress}%` }} />
          </div>
          <p className="text-sm text-gray-400">{ocrProgress}%（10〜20秒かかります）</p>
        </div>
      </div>
    );
  }

  if (phase === 'confirm') {
    return (
      <div className="min-h-screen pb-20 bg-gray-50">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setPhase('input')} className="text-gray-500 text-lg">←</button>
          <h1 className="text-base font-bold text-gray-900">内容を確認</h1>
        </header>
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">健診機関</label>
              <input type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)}
                placeholder="例: ○○健診センター" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">総合判定</label>
              <select value={overallJudgment} onChange={(e) => setOverallJudgment(e.target.value as JudgmentLevel)}
                className={inputCls}>
                <option value="">未記入</option>
                {JUDGMENT_OPTS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">検査結果</h3>
              <button onClick={() => setItems([...items, { item_name: '', value: undefined, unit: '', judgment: undefined }])}
                className="text-xs text-indigo-600">+ 追加</button>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-2">
                  <input type="text" value={item.item_name ?? ''} onChange={(e) => {
                    const newItems = [...items]; newItems[i] = { ...item, item_name: e.target.value }; setItems(newItems);
                  }} placeholder="項目名" className="flex-1 text-xs border-0 outline-none bg-transparent text-gray-900" />
                  <input type="number" value={item.value ?? ''} onChange={(e) => {
                    const newItems = [...items]; newItems[i] = { ...item, value: Number(e.target.value) }; setItems(newItems);
                  }} placeholder="値" className="w-16 text-xs border-0 outline-none bg-transparent text-gray-700 text-right" />
                  <input type="text" value={item.unit ?? ''} onChange={(e) => {
                    const newItems = [...items]; newItems[i] = { ...item, unit: e.target.value }; setItems(newItems);
                  }} placeholder="単位" className="w-12 text-xs border-0 outline-none bg-transparent text-gray-400" />
                  <select value={item.judgment ?? ''} onChange={(e) => {
                    const newItems = [...items]; newItems[i] = { ...item, judgment: e.target.value as JudgmentLevel }; setItems(newItems);
                  }} className={`w-10 text-xs border-0 bg-transparent outline-none ${JUDGMENT_COLOR[item.judgment ?? ''] ?? 'text-gray-400'}`}>
                    <option value="">-</option>
                    {JUDGMENT_OPTS.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                  <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-gray-200 text-sm">✕</button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-4 py-4 text-xs text-gray-400 text-center">OCRで読み取るか、＋追加ボタンで手入力してください</p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setPhase('input')} className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl text-sm">
              やり直し
            </button>
            <button onClick={handleSave} disabled={!memberId || saving}
              className="flex-[2] bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-3.5 rounded-xl text-sm">
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-base font-bold text-gray-900">健診結果を登録</h1>
      </header>

      <div className="px-4 py-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">受診者 *</label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputCls}>
            <option value="">選択</option>
            {members?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">受診日 *</label>
          <input type="date" value={checkupDate} onChange={(e) => setCheckupDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">種別</label>
          <select value={checkupType} onChange={(e) => setCheckupType(e.target.value)} className={inputCls}>
            {['定期健診', '人間ドック', '特定健診', 'がん検診', 'その他'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            結果票の写真（複数枚OK）
          </label>
          <div className="flex gap-2 flex-wrap">
            {imagePreviews.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} alt={`page${i+1}`} className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                <button
                  onClick={() => { setImagePreviews((l) => l.filter((_, idx) => idx !== i)); setImageBase64List((l) => l.filter((_, idx) => idx !== i)); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >✕</button>
              </div>
            ))}
            <button onClick={() => cameraInputRef.current?.click()}
              className="w-20 h-20 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-2xl active:bg-gray-50">
              +
            </button>
          </div>
        </div>

        {imageBase64List.length > 0 ? (
          <button onClick={handleOcr}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2">
            ⚡ OCRで読み取る
          </button>
        ) : (
          <button onClick={() => { setItems([]); setPhase('confirm'); }}
            className="w-full border border-gray-200 text-gray-600 py-4 rounded-xl text-sm">
            写真なしで手入力する
          </button>
        )}
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
        onChange={(e) => Array.from(e.target.files ?? []).forEach(handleImageAdd)} />

      <BottomNav />
    </div>
  );
}
