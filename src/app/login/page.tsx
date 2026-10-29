'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../lib/store';
import { getEmployeeSegments } from '../../types';
import { Delete, KeyRound, ShieldAlert, CheckCircle, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { currentEmployee, loginWithPin, loginWithEmployeeCode, employees } = useStore();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (currentEmployee) {
      if (currentEmployee.role === 'admin' || currentEmployee.role === 'supervisor') {
        router.push('/admin');
      } else {
        router.push('/operador');
      }
    }
  }, [currentEmployee, router]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        attemptLogin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const attemptLogin = (code: string) => {
    const res = loginWithPin(code);
    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/operador');
      }, 500);
    } else {
      setError(res.error || 'PIN no reconocido');
      setPin('');
    }
  };

  const handleQuickDemo = (code: string) => {
    const success = loginWithEmployeeCode(code);
    if (success) {
      router.push('/operador');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Cabecera */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Acceso a Planta
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Digite su PIN numérico de 4 dígitos para ingresar a su segmento de producción.
          </p>
        </div>

        {/* Indicador de Dígitos PIN */}
        <div className="flex justify-center items-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const hasVal = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  hasVal
                    ? 'bg-blue-600 border-blue-600 scale-110 shadow-sm'
                    : 'bg-slate-100 border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {isSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            PIN validado. Accediendo a estación de trabajo...
          </div>
        )}

        {/* Teclado Numérico Táctil */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto select-none">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="h-16 w-16 mx-auto rounded-2xl bg-slate-50 border border-slate-200 text-2xl font-black text-slate-800 flex items-center justify-center shadow-sm active:bg-blue-600 active:text-white active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 w-16 mx-auto rounded-2xl bg-slate-100 text-xs font-bold text-slate-600 flex items-center justify-center active:bg-slate-200"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-16 w-16 mx-auto rounded-2xl bg-slate-50 border border-slate-200 text-2xl font-black text-slate-800 flex items-center justify-center shadow-sm active:bg-blue-600 active:text-white active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-16 w-16 mx-auto rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center active:bg-slate-200 active:scale-95"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Accesos Rápidos de Prueba (Demo) */}
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider">
            Accesos Rápidos Demo (Sin digitar)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {employees
              .filter((e) => e.active)
              .slice(0, 8)
              .map((emp) => {
                const segs = getEmployeeSegments(emp);
                const roleBadge =
                  emp.role === 'admin'
                    ? 'Admin'
                    : emp.role === 'supervisor'
                    ? 'Supervisor'
                    : `Seg ${segs.join(',')}`;

                const bgColors: Record<string, string> = {
                  admin: 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200',
                  supervisor: 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200',
                  operator: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200',
                };

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleQuickDemo(emp.employee_code)}
                    className={`p-2 rounded-xl border text-left truncate flex items-center gap-1.5 transition-colors font-bold ${
                      bgColors[emp.role] || 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                    title={`${emp.full_name} (${emp.employee_code}) - PIN: ${emp.pin}`}
                  >
                    <UserCheck className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">
                      {emp.full_name.split(' ')[0]} · {roleBadge} ({emp.pin})
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
