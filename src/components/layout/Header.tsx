'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '../../lib/store';
import { getEmployeeSegments } from '../../types';
import { LogOut, LayoutDashboard, ClipboardPen, ShieldCheck, User } from 'lucide-react';

export function Header() {
  const { currentEmployee, logout } = useStore();
  const pathname = usePathname();

  // Ocultar barra superior detallada en página de login
  if (pathname === '/login') {
    return (
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-black text-xl tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            JM PROQUEST
          </div>
          <div className="text-[11px] font-semibold text-slate-400">
            Planta de Producción · Trazabilidad Operativa V1
          </div>
        </div>
        <div className="text-xs bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300 font-bold">
          Acceso por PIN
        </div>
      </header>
    );
  }

  const employeeSegments = currentEmployee ? getEmployeeSegments(currentEmployee) : [];

  const roleLabels = {
    operator: `Operador Seg. ${employeeSegments.join(', ') || '—'}`,
    supervisor: 'Supervisor de Planta',
    admin: 'Administrador General',
  };

  const segmentColors: Record<number, string> = {
    1: 'bg-slate-700 text-slate-100',
    2: 'bg-amber-600 text-amber-50',
    3: 'bg-orange-600 text-orange-50',
    4: 'bg-emerald-600 text-emerald-50',
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg text-white shadow-md shadow-blue-500/30">
            JM
          </div>
          <div>
            <div className="font-black text-base sm:text-lg tracking-tight text-white leading-tight">
              JM PROQUEST
            </div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Trazabilidad 4 Segmentos
            </div>
          </div>
        </Link>

        {/* Navegación según Rol */}
        {currentEmployee && (
          <nav className="flex items-center gap-2 sm:gap-3">
            {/* Botón Módulo Operador */}
            <Link
              href="/operador"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                pathname === '/operador'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ClipboardPen className="w-4 h-4" />
              <span className="hidden sm:inline">Operaciones</span>
            </Link>

            {/* Botón Módulo Administrador / Supervisor */}
            {(currentEmployee.role === 'admin' || currentEmployee.role === 'supervisor') && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  pathname === '/admin'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard & Alertas</span>
              </Link>
            )}

            {/* Badge de Empleado Activo: Siempre visible y optimizado para tablet */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-800">
              <div className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-xl transition-all">
                {/* Código de empleado destacado */}
                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-600 text-white tracking-wide shadow-sm">
                  {currentEmployee.employee_code}
                </span>

                {/* Nombre y rol */}
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black text-white truncate max-w-[110px] sm:max-w-[160px] md:max-w-[200px]">
                    {currentEmployee.full_name}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 leading-none mt-0.5">
                    {roleLabels[currentEmployee.role]}
                  </span>
                </div>

                {/* Badge de segmentos si es operador */}
                {currentEmployee.role === 'operator' ? (
                  <div className="hidden sm:flex items-center gap-1 ml-1">
                    {employeeSegments.map((seg) => (
                      <span
                        key={seg}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          segmentColors[seg] || 'bg-slate-700 text-white'
                        }`}
                      >
                        S{seg}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="hidden sm:inline-flex text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 border border-purple-700/50 ml-1">
                    <ShieldCheck className="w-2.5 h-2.5 inline mr-0.5" />
                    {currentEmployee.role === 'admin' ? 'ADMIN' : 'SUP.'}
                  </span>
                )}
              </div>
            </div>

            {/* Botón Salir */}
            <button
              type="button"
              onClick={logout}
              title="Cerrar sesión"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-300 transition-colors ml-1 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        )}

        {!currentEmployee && (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
          >
            <User className="w-3.5 h-3.5" /> Ingresar PIN
          </Link>
        )}
      </div>
    </header>
  );
}
