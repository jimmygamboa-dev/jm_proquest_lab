'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../lib/store';

export default function HomePage() {
  const router = useRouter();
  const { currentEmployee } = useStore();

  useEffect(() => {
    if (!currentEmployee) {
      router.push('/login');
    } else if (currentEmployee.role === 'admin' || currentEmployee.role === 'supervisor') {
      router.push('/admin');
    } else {
      router.push('/operador');
    }
  }, [currentEmployee, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold tracking-tight text-slate-300">
          Cargando JM PROQUEST...
        </span>
      </div>
    </div>
  );
}
