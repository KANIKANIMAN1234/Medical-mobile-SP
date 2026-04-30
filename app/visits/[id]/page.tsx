'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVisit, useDeleteVisit } from '@/hooks/useData';
import BottomNav from '@/components/BottomNav';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: visit, isLoading } = useVisit(id);
  const deleteVisit = useDeleteVisit();
  const [showDelete, setShowDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!visit) return <div className="p-6 text-center text-gray-500">記録が見つかりません</div>;

  const handleDelete = async () => {
    await deleteVisit.mutateAsync(id);
    router.push('/visits');
  };

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-base font-bold text-gray-900">通院記録</h1>
        <button onClick={() => setShowDelete(true)} className="text-red-500 text-sm">削除</button>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* 基本情報 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-base font-bold text-gray-900">
                {format(parseISO(visit.visit_date), 'yyyy年M月d日（E）', { locale: ja })}
              </p>
              {visit.member && (
                <p className="text-xs text-gray-500">{visit.member.name}</p>
              )}
            </div>
          </div>

          <dl className="space-y-2 text-sm">
            <Row label="病院" value={visit.hospital?.name ?? visit.hospital_name} />
            {visit.department && <Row label="診療科" value={visit.department} />}
            {visit.doctor_name && <Row label="担当医" value={visit.doctor_name} />}
          </dl>
        </div>

        {/* 診察内容 */}
        {(visit.chief_complaint || visit.diagnosis || visit.notes) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">診察内容</h2>
            <dl className="space-y-2 text-sm">
              {visit.chief_complaint && <Row label="主訴" value={visit.chief_complaint} />}
              {visit.diagnosis && <Row label="診断名" value={visit.diagnosis} />}
              {visit.notes && <Row label="メモ" value={visit.notes} />}
            </dl>
          </div>
        )}

        {/* 次回予約 */}
        {visit.next_visit_date && (
          <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 flex items-center gap-3">
            <span className="text-2xl">📆</span>
            <div>
              <p className="text-xs text-indigo-500 font-medium">次回予約</p>
              <p className="text-sm font-bold text-indigo-700">
                {format(parseISO(visit.next_visit_date), 'yyyy年M月d日（E）', { locale: ja })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 削除確認 */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-3">
            <p className="text-center font-semibold text-gray-900">この記録を削除しますか？</p>
            <p className="text-center text-xs text-gray-500">この操作は取り消せません</p>
            <button onClick={handleDelete} disabled={deleteVisit.isPending}
              className="w-full bg-red-500 text-white py-3.5 rounded-xl font-bold text-sm">
              削除する
            </button>
            <button onClick={() => setShowDelete(false)}
              className="w-full border border-gray-200 text-gray-600 py-3.5 rounded-xl text-sm">
              キャンセル
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-gray-400 w-20 flex-shrink-0">{label}</dt>
      <dd className="text-gray-900 flex-1">{value}</dd>
    </div>
  );
}
