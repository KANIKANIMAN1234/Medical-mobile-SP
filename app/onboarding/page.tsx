'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { Organization } from '@/types/app';

type Step = 'choose' | 'create' | 'join';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setCurrentOrganization, setOrganizations } = useAppStore();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('choose');
  const [orgName, setOrgName] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data: org, error: orgError } = await supabase
        .from('m_organizations')
        .insert({ name: orgName.trim(), plan: 'trial', created_by: user!.id })
        .select()
        .single();
      if (orgError) throw orgError;

      await supabase.from('m_organization_users').insert({
        organization_id: org.id,
        user_id: user!.id,
        role: 'owner',
      });

      setOrganizations([org as Organization]);
      setCurrentOrganization(org as Organization, 'owner');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError('グループの作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinViaUrl = () => {
    const token = inviteUrl.split('/invite/')[1]?.split('?')[0];
    if (token) {
      router.push(`/invite/${token}`);
    } else {
      setError('招待URLの形式が正しくありません。');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏥</div>
          <h1 className="text-lg font-bold text-gray-900">お薬手帳・通院記録くん</h1>
          <p className="text-sm text-gray-500 mt-2">
            ようこそ、{user?.display_name} さん！<br />
            まずグループを作成してください。
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {step === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('create')}
                className="w-full flex items-center gap-4 p-4 border-2 border-indigo-200 rounded-xl text-left active:bg-indigo-50"
              >
                <span className="text-2xl">➕</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">新しいグループを作成</p>
                  <p className="text-xs text-gray-500 mt-0.5">家族・自分だけの記録を始める</p>
                </div>
              </button>
              <button
                onClick={() => setStep('join')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl text-left active:bg-gray-50"
              >
                <span className="text-2xl">🔗</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">招待リンクで参加</p>
                  <p className="text-xs text-gray-500 mt-0.5">既存グループへ参加する</p>
                </div>
              </button>
            </div>
          )}

          {step === 'create' && (
            <div>
              <button onClick={() => setStep('choose')} className="text-sm text-indigo-600 mb-4">← 戻る</button>
              <p className="text-sm font-medium text-gray-700 mb-2">グループ名</p>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="例: 山田家"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                maxLength={50}
              />
              <p className="text-xs text-gray-400 mb-4">※ 後から変更できます</p>
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <button
                onClick={handleCreateOrg}
                disabled={!orgName.trim() || loading}
                className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-3.5 rounded-xl text-sm"
              >
                {loading ? '作成中...' : '作成して始める →'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">30日間無料トライアル</p>
            </div>
          )}

          {step === 'join' && (
            <div>
              <button onClick={() => setStep('choose')} className="text-sm text-indigo-600 mb-4">← 戻る</button>
              <p className="text-sm font-medium text-gray-700 mb-2">招待URL</p>
              <input
                type="text"
                value={inviteUrl}
                onChange={(e) => setInviteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <button
                onClick={handleJoinViaUrl}
                disabled={!inviteUrl.trim()}
                className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-3.5 rounded-xl text-sm"
              >
                参加する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
