'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMembers, useHospitals, useCreateHospital, useCreateVisit } from '@/hooks/useData';
import { useAppStore } from '@/stores/appStore';
import BottomNav from '@/components/BottomNav';

const DEPARTMENTS = ['内科', '外科', '小児科', '整形外科', '皮膚科', '眼科', '耳鼻科', '歯科', '産婦人科', '精神科', 'その他'];

type Step = 1 | 2 | 3;

export default function NewVisitPage() {
  const router = useRouter();
  const { selectedMemberId } = useAppStore();
  const { data: members } = useMembers();
  const { data: hospitals, refetch: refetchHospitals } = useHospitals();
  const createHospital = useCreateHospital();
  const createVisit = useCreateVisit();

  const [step, setStep] = useState<Step>(1);
  const [memberId, setMemberId] = useState(selectedMemberId ?? members?.[0]?.id ?? '');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [hospitalId, setHospitalId] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [department, setDepartment] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [newHospitalName, setNewHospitalName] = useState('');
  const [showNewHospital, setShowNewHospital] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddHospital = async () => {
    if (!newHospitalName.trim()) return;
    try {
      const result = await createHospital.mutateAsync({ name: newHospitalName.trim() });
      await refetchHospitals();
      setHospitalId(result.id);
      setNewHospitalName('');
      setShowNewHospital(false);
    } catch {
      setError('病院の追加に失敗しました');
    }
  };

  const handleSave = async () => {
    if (!memberId || (!hospitalId && !hospitalName)) return;
    setSaving(true);
    setError('');
    try {
      await createVisit.mutateAsync({
        member_id: memberId,
        visit_date: visitDate,
        hospital_id: hospitalId || undefined,
        hospital_name: !hospitalId ? hospitalName : undefined,
        department: department || undefined,
        chief_complaint: chiefComplaint || undefined,
        diagnosis: diagnosis || undefined,
        doctor_name: doctorName || undefined,
        next_visit_date: nextVisitDate || undefined,
        notes: notes || undefined,
      });
      router.push('/visits');
    } catch {
      setError('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const stepDots = (
    <div className="flex items-center gap-2 mb-6">
      {([1, 2, 3] as Step[]).map((s) => (
        <span key={s} className={`w-2 h-2 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
      ))}
      <span className="text-xs text-gray-400 ml-1">STEP {step}/3</span>
    </div>
  );

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-base font-bold text-gray-900">通院記録を登録</h1>
      </header>

      <div className="px-4 py-6">
        {stepDots}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">受診者 *</label>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputCls}>
                <option value="">選択してください</option>
                {members?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">受診日 *</label>
              <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">病院 *</label>
              {!showNewHospital ? (
                <>
                  <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} className={inputCls}>
                    <option value="">選択してください</option>
                    {hospitals?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  <button
                    onClick={() => setShowNewHospital(true)}
                    className="mt-2 text-xs text-indigo-600 font-medium"
                  >
                    + 新しい病院を追加
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newHospitalName}
                    onChange={(e) => setNewHospitalName(e.target.value)}
                    placeholder="病院名を入力"
                    className={inputCls}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddHospital} disabled={!newHospitalName.trim() || createHospital.isPending}
                      className="flex-1 bg-indigo-600 text-white text-sm py-2.5 rounded-xl font-medium">
                      追加
                    </button>
                    <button onClick={() => setShowNewHospital(false)}
                      className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-xl">
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">診療科</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls}>
                <option value="">選択してください</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!memberId || (!hospitalId && !newHospitalName.trim() && !showNewHospital)}
              className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl text-sm mt-2"
            >
              次へ →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">主訴（受診理由）</label>
              <textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="例: 頭痛・めまい" rows={2} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">診断名</label>
              <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="例: 高血圧症" rows={2} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">担当医</label>
              <input type="text" value={doctorName} onChange={(e) => setDoctorName(e.target.value)}
                placeholder="例: 田中先生" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">次回予約日</label>
              <input type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">メモ</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="気になったことなど" rows={3} className={inputCls + ' resize-none'} />
            </div>
            <button onClick={() => setStep(3)}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl text-sm mt-2">
              次へ →
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">入力内容の確認</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-20 flex-shrink-0">受診者</dt>
                  <dd className="text-gray-900">{members?.find((m) => m.id === memberId)?.name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-20 flex-shrink-0">受診日</dt>
                  <dd className="text-gray-900">{visitDate}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-20 flex-shrink-0">病院</dt>
                  <dd className="text-gray-900">{hospitals?.find((h) => h.id === hospitalId)?.name ?? hospitalName}</dd>
                </div>
                {department && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-20 flex-shrink-0">診療科</dt>
                    <dd className="text-gray-900">{department}</dd>
                  </div>
                )}
                {chiefComplaint && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-20 flex-shrink-0">主訴</dt>
                    <dd className="text-gray-900">{chiefComplaint}</dd>
                  </div>
                )}
                {nextVisitDate && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-20 flex-shrink-0">次回</dt>
                    <dd className="text-gray-900">{nextVisitDate}</dd>
                  </div>
                )}
              </dl>
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />保存中...</>
              ) : '✅ 保存する'}
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
