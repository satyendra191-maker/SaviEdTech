'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LessonsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/lectures');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg font-semibold text-slate-500">
        Redirecting to lectures...
      </div>
    </div>
  );
}
