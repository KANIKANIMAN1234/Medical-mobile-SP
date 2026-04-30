'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMembers, useCreateMember } from '@/hooks/useData';
import { useAppStore } from '@/stores/appStore';
import BottomNav from '@/components/BottomNav';
import { createClient } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const { user, currentOrganization, logout } = useAppStore();
  const { data: members, isLoading } = useMembers();
  const createMember = useCreateMember();
  const supabase = createClient();

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRelation, setMemberRelation] = useState('');
  const [isSelf, setIsSelf] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddMember = async () => {
    if (!memberName.trim()) return;
    setSaving(true);
    try {
      await createMember.mutateAsync({
        name: memberName.trim(),
        relationship: memberRelation || undefined,
        is_self: isSelf,
      });
      setShowAddMember(false);
      setMemberName('');
      setMemberRelation('');
      setIsSelf(false);
    } catch { /* noop */ }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/');
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-base font-bold text-gray-900">⚙️ 設定</h1>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* プロフィール */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">プロフィール</h2>
          </div>
          <div className="px-4 py-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
              {user?.picture_url ? (
                <img src={user.picture_url} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
              ) : '👤'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.display_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">グループ: {currentOrganization?.name}</p>
            </div>
          </div>
        </section>

        {/* メンバー管理 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">家族メンバー</h2>
            <button onClick={() => setShowAddMember(true)}
              className="text-xs text-indigo-600 font-medium">
              + 追加
            </button>
          </div>
          {isLoading ? (
            <div className="px-4 py-4 text-sm text-gray-400">読み込み中...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members?.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: m.avatar_color ?? '#6366f1' }}>
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-400">
                      {m.is_self ? '本人' : (m.relationship ?? '家族')}
                    </p>
                  </div>
                </div>
              ))}
              {!members?.length && (
                <p className="px-4 py-4 text-sm text-gray-400">メンバーがいません</p>
              )}
            </div>
          )}
        </section>

        {/* ログアウト */}
        <button onClick={handleLogout}
          className="w-full bg-white border border-red-200 text-red-500 py-3.5 rounded-2xl text-sm font-medium">
          ログアウト
        </button>

        <p className="text-center text-xs text-gray-400">お薬手帳・通院記録くん</p>
      </div>

      {/* メンバー追加フォーム */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900">メンバーを追加</h2>
              <button onClick={() => setShowAddMember(false)} className="text-gray-400 text-lg">✕</button>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">名前 *</label>
              <input type="text" value={memberName} onChange={(e) => setMemberName(e.target.value)}
                placeholder="例: 山田 花子" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">続柄</label>
              <input type="text" value={memberRelation} onChange={(e) => setMemberRelation(e.target.value)}
                placeholder="例: 妻・父・子ども" className={inputCls} />
            </div>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={isSelf} onChange={(e) => setIsSelf(e.target.checked)}
                className="w-5 h-5 accent-indigo-600" />
              <span className="text-sm text-gray-700">本人（自分自身）</span>
            </label>
            <button onClick={handleAddMember} disabled={!memberName.trim() || saving}
              className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl text-sm mt-1">
              {saving ? '追加中...' : '追加する'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
