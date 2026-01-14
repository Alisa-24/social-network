'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout, type User } from '@/lib/auth';

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black">
      <nav className="border-b border-zinc-800 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-white">Social Network</h1>
            <div className="flex items-center gap-4">
              <span className="text-zinc-400">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm border border-zinc-800 text-white rounded-md hover:bg-zinc-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border border-zinc-800 rounded-lg bg-black p-8 text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Welcome, {user.firstName}!
          </h2>
          <p className="text-zinc-400">Your feed will appear here.</p>
        </div>
      </main>
    </div>
  );
}
