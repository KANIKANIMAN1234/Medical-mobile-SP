'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMembers, useCreateMember, useOrganizationUsers } from '@/hooks/useData';
import { useAppStore } from '@/stores/appStore';
import BottomNav from '@/components/BottomNav';
import { createClient } from '@/lib/supabase';

type AddMode = 'app-user' | 'manual';

export default function SettingsPage() {
  const router = useRouter();
  const { user, currentOrganization, logout } = useAppStore();
  const { data: members, isLoading } = useMembers();
  const { data: orgUsers = [] } = useOrganizationUsers();
  const createMember = useCreateMember();
  const supabase = createClient();

  const [showAddMember, setShowAddMember] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('app-user');
  const [selectedOrgUserId, setSelectedOrgUserId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberRelation, setMemberRelation] = useState('');
  const [isSelf, setIsSelf] = useState(false);
  const [saving, setSaving] = useState(false);

  // 既にメンバー登録済みのユーザーIDセット（重複防止）
  const registeredUserIds = new Set(
    members?.map((m) => (m as typeof m & { linked_user_id?: string }).linked_user_id).filter(Boolean)
  );

  // 自分以外の組織内ユーザー（まだメンバー未登録のユーザーを上部に表示）
  const availableOrgUsers = orgUsers
    .filter((ou) => ou.user)
    .sort((a, b) => {
      const aRegistered = registeredUserIds.has(a.user_id);
      const bRegistered = registeredUserIds.has(b.user_id);
      if (aRegistered !== bRegistered) return aRegistered ? 1 : -1;
      return (a.user?.display_name ?? '').localeCompare(b.user?.display_name ?? '');
    });

  const handleSelectOrgUser = (userId: string) => {
    setSelectedOrgUserId(userId);
    const found = orgUsers.find((ou) => ou.user_id === userId);
    if (found?.user) {
      setMemberName(found.user.display_name ?? '');
    }
  };

  const handleOpenForm = () => {
    setAddMode('app-user');
    setSelectedOrgUserId('');
    setMemberName('');
    setMemberRelation('');
    setIsSelf(false);
    setShowAddMember(true);
  };

  const handleAddMember = async () => {
    const nameToSave = addMode === 'app-user'
      ? (orgUsers.find((ou) => ou.user_id === selectedOrgUserId)?.user?.display_name ?? memberName)
      : memberName;

    if (!nameToSave.trim()) return;
    setSaving(true);
    try {
      await createMember.mutateAsync({
        name: nameToSave.trim(),
        relationship: memberRelation || undefined,
        is_self: isSelf,
      });
      setShowAddMember(false);
    } catch { /* noop */ }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/');
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

  const selectedUser = orgUsers.find((ou) => ou.user_id === selectedOrgUserId)?.user;

  const canSave = addMode === 'app-user'
    ? !!selectedOrgUserId
    : !!memberName.trim();

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
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-2xl overflow-hidden">
              {user?.picture_url
                ? <img src={user.picture_url} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
                : '👤'}
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
            <button onClick={handleOpenForm} className="text-xs text-indigo-600 font-medium">
              + 追加
            </button>
          </div>
          {isLoading ? (
            <div className="px-4 py-4 text-sm text-gray-400">読み込み中...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members?.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: m.avatar_color ?? '#6366f1' }}
                  >
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
        <button
          onClick={handleLogout}
          className="w-full bg-white border border-red-200 text-red-500 py-3.5 rounded-2xl text-sm font-medium"
        >
          ログアウト
        </button>

        <p className="text-center text-xs text-gray-400">お薬手帳・通院記録くん</p>
      </div>

      {/* メンバー追加フォーム */}
      {showAddMember && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50">
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">メンバーを追加</h2>
              <button onClick={() => setShowAddMember(false)} className="text-gray-400 text-lg">✕</button>
            </div>

            {/* モード切替タブ */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
              <button
                onClick={() => { setAddMode('app-user'); setSelectedOrgUserId(''); }}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  addMode === 'app-user'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                👥 グループ内ユーザーから選択
              </button>
              <button
                onClick={() => { setAddMode('manual'); setMemberName(''); }}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  addMode === 'manual'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                ✏️ 手動で入力
              </button>
            </div>

            <div className="space-y-4">
              {/* ─── アプリユーザーから選択モード ─── */}
              {addMode === 'app-user' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-2 block">
                      グループに参加済みのユーザー
                    </label>
                    {availableOrgUsers.length === 0 ? (
                      <div className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
                        グループに他のユーザーがいません
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {availableOrgUsers.map((ou) => {
                          const isSelected = selectedOrgUserId === ou.user_id;
                          const isAlreadyMember = registeredUserIds.has(ou.user_id);
                          return (
                            <button
                              key={ou.user_id}
                              type="button"
                              disabled={isAlreadyMember}
                              onClick={() => handleSelectOrgUser(ou.user_id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : isAlreadyMember
                                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                  : 'border-gray-100 bg-white active:bg-gray-50'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 flex items-center justify-center">
                                {ou.user?.picture_url
                                  ? <img src={ou.user.picture_url} alt="" className="w-10 h-10 object-cover" />
                                  : <span className="text-sm font-bold text-indigo-500">{ou.user?.display_name?.charAt(0)}</span>
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{ou.user?.display_name}</p>
                                <p className="text-xs text-gray-400">
                                  {ou.role === 'owner' ? 'オーナー' : ou.role === 'editor' ? '編集者' : '閲覧者'}
                                  {isAlreadyMember && ' · 登録済み'}
                                </p>
                              </div>
                              {isSelected && <span className="text-indigo-500 text-lg flex-shrink-0">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 選択中ユーザーのプレビュー */}
                  {selectedUser && (
                    <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-200 flex-shrink-0">
                        {selectedUser.picture_url
                          ? <img src={selectedUser.picture_url} alt="" className="w-full h-full object-cover" />
                          : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-white">{selectedUser.display_name?.charAt(0)}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-indigo-700">{selectedUser.display_name}</p>
                        <p className="text-xs text-indigo-400">このユーザーをメンバーとして追加します</p>
                      </div>
                    </div>
                  )}

                  {/* 続柄 */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">続柄（任意）</label>
                    <input
                      type="text"
                      value={memberRelation}
                      onChange={(e) => setMemberRelation(e.target.value)}
                      placeholder="例: 妻・父・子ども"
                      className={inputCls}
                    />
                  </div>

                  {/* 本人チェック */}
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelf}
                      onChange={(e) => setIsSelf(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">本人（自分自身）</span>
                  </label>
                </>
              )}

              {/* ─── 手動入力モード ─── */}
              {addMode === 'manual' && (
                <>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                    アプリを使っていない家族（お子さま・ご高齢の方など）を手動で登録します。
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">名前 *</label>
                    <input
                      type="text"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="例: 山田 花子"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">続柄（任意）</label>
                    <input
                      type="text"
                      value={memberRelation}
                      onChange={(e) => setMemberRelation(e.target.value)}
                      placeholder="例: 妻・父・子ども"
                      className={inputCls}
                    />
                  </div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelf}
                      onChange={(e) => setIsSelf(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">本人（自分自身）</span>
                  </label>
                </>
              )}

              <button
                onClick={handleAddMember}
                disabled={!canSave || saving}
                className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl text-sm"
              >
                {saving ? '追加中...' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
