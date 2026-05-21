'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) router.push('/login');
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  return (
    <main className="dashboard">
      <motion.div className="glass dash-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <h1>Welcome, {user?.name?.split(' ')[0]}</h1>
        <p>Your cinematic AI workspace is coming soon.</p>
      </motion.div>
    </main>
  );
}
