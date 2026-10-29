'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { QualityAlert } from '../../types';

interface QualityAlertBannerProps {
  alerts: QualityAlert[];
  onSelectAlert?: (alert: QualityAlert) => void;
  tvMode?: boolean;
}

export function QualityAlertBanner({ alerts, onSelectAlert, tvMode = false }: QualityAlertBannerProps) {
  if (!alerts.length) return null;

  const criticalCount = alerts.filter((a) => a.level === 'critical').length;
  const hasCritical = criticalCount > 0;

  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-all shadow-md ${
        hasCritical
          ? 'bg-red-50/90 border-red-300 text-red-950 animate-pulse-slow'
          : 'bg-amber-50/90 border-amber-300 text-amber-950'
      } ${tvMode ? 'p-6' : 'p-4'}`}
    >
      <div className="flex items-center justify-between mb-3 border-b pb-2.5 border-current/15">
        <div className="flex items-center gap-2.5">
          {hasCritical ? (
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
          )}
          <div>
            <h2 className={`font-black tracking-tight ${tvMode ? 'text-2xl' : 'text-base'}`}>
              {hasCritical ? '⚠ ALERTA PRIORITARIA DE CALIDAD' : '⚠ REVISIONES PENDIENTES DE PROCESO'}
            </h2>
            <p className="text-xs font-semibold opacity-80">
              {alerts.length} aviso{alerts.length > 1 ? 's' : ''} activo{alerts.length > 1 ? 's' : ''}{' '}
              {hasCritical && `(${criticalCount} crítico${criticalCount > 1 ? 's' : ''})`}
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            hasCritical ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
          }`}
        >
          {hasCritical ? 'Acción Requerida' : 'Informativo'}
        </span>
      </div>

      <div className="space-y-2 mt-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => onSelectAlert && onSelectAlert(alert)}
            className={`p-3 rounded-xl border flex items-start justify-between gap-3 bg-white/80 backdrop-blur-sm transition-all ${
              alert.level === 'critical'
                ? 'border-red-200 hover:border-red-400'
                : 'border-amber-200 hover:border-amber-400'
            } ${onSelectAlert ? 'cursor-pointer hover:shadow-sm' : ''}`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {alert.level === 'critical' ? (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {alert.stage}
                  </span>
                  <span className="text-sm font-bold text-slate-900 truncate">
                    {alert.title}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">
                  {alert.message}
                </p>
              </div>
            </div>

            {onSelectAlert && (
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
