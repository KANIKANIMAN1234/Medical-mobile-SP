'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { Organization, OrganizationUser } from '@/types/app';

export default function CallbackPage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <CallbackInner />
    </Suspense>
  );
}

function LoadingView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">ログイン中...</p>
      </div>
    </div>
  );
}

function CallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const { setUser, setCurrentOrganization, setOrganizations } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) { setError('認証コードが見つかりません'); return; }

    (async () => {
      try {
        const tokenRes = await fetch('/api/auth/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.id_token) throw new Error(tokenData.error || 'IDトークンの取得に失敗しました');

        const authRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-line`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ id_token: tokenData.id_token }),
          }
        );
        const { data, error: authError } = await authRes.json();
        if (authError) throw new Error(authError);

        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        const { data: userData, error: userError } = await supabase
          .from('m_users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        if (userError) throw userError;
        setUser(userData);

        const { data: orgUsersData } = await supabase
          .from('m_organization_users')
          .select('*, organization:m_organizations(*)')
          .eq('user_id', userData.id);

        if (orgUsersData && orgUsersData.length > 0) {
          const orgs = orgUsersData.map((ou: OrganizationUser) => ou.organization as Organization).filter(Boolean);
          setOrganizations(orgs);
          const firstOrgUser = orgUsersData[0] as OrganizationUser;
          setCurrentOrganization(firstOrgUser.organization as Organization, firstOrgUser.role);
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } catch (err) {
        console.error(err);
        setError('ログインに失敗しました。もう一度お試しください。');
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-4xl mb-4">😢</div>
          <p className="text-red-600 mb-6 text-sm">{error}</p>
          <a href="/" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium">
            ログインページへ戻る
          </a>
        </div>
      </div>
    );
  }

  return <LoadingView />;
}
