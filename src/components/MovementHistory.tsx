/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpLeft, Search, Filter, Calendar, Trash2, ShieldAlert } from 'lucide-react';
import { Movement } from '../types';

interface MovementHistoryProps {
  movements: Movement[];
  onDeleteMovement: (idx: number) => void;
  onClearHistory: () => void;
}

export function MovementHistory({
  movements,
  onDeleteMovement,
  onClearHistory,
}: MovementHistoryProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'HYRJE' | 'DALJE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = movements.filter((m) => {
    const matchesType = filterType === 'ALL' || m.type === filterType;
    const matchesSearch =
      m.articleCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.client || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            Historiku i Lëvizjeve (Logu)
            <span className="text-xs bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded-full font-bold border border-slate-200">
              {filtered.length} regjistrime
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Historiku i plotë i transaksioneve të hyrjeve dhe daljeve të pjesëve të këmbimit
          </p>
        </div>

        {movements.length > 0 && (
          <button
            onClick={() => {
              if (confirm('A jeni të sigurt që dëshironi të fshini të gjithë historikun e lëvizjeve? Kjo nuk ndikon në sasitë aktuale të stokut.')) {
                onClearHistory();
              }
            }}
            className="cursor-pointer text-xs font-bold text-rose-600 hover:text-rose-750 transition duration-150 self-start sm:self-auto"
          >
            Pastro të Gjithë Historikun
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-5">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Kërko sipas kodit SKU të artikullit ose klientit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
          />
        </div>

        <div className="sm:col-span-4 relative flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'ALL' | 'HYRJE' | 'DALJE')}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
          >
            <option value="ALL">Gjithë Lëvizjet</option>
            <option value="HYRJE">Vetët Hyrje (Hyrëse)</option>
            <option value="DALJE">Vetëm Dalje (Shitje)</option>
          </select>
        </div>
      </div>

      {/* Logs list/table */}
      {filtered.length === 0 ? (
        <div className="bg-slate-50 text-slate-400 text-sm p-10 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center gap-1">
          <Calendar className="w-10 h-10 text-slate-300 mb-1" />
          <span>Nuk ka asnjë transaksion të regjistruar për këtë kërkim.</span>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-[350px]">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
              <tr className="uppercase text-[9px] sm:text-[10px] tracking-wider font-bold">
                <th className="p-3 sm:p-4">Data Logut</th>
                <th className="p-3 sm:p-4">Artikulli / SKU</th>
                <th className="p-3 sm:p-4">Tipi</th>
                <th className="p-3 sm:p-4">Sasia e Regjistruar</th>
                <th className="p-3 sm:p-4">Klienti ose Nr. Riparimi</th>
                <th className="p-3 sm:p-4 text-right">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] sm:text-xs">
              {filtered.map((m, idx) => {
                const isHyrje = m.type === 'HYRJE';
                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition duration-150 text-slate-700">
                    <td className="p-3 sm:p-4 text-slate-400 tracking-tight">{m.date}</td>
                    <td className="p-3 sm:p-4 font-bold text-slate-800">{m.articleCode}</td>
                    <td className="p-3 sm:p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isHyrje
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isHyrje ? <ArrowUpLeft className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {m.type}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 font-bold">
                      {m.quantity} {m.unit || 'Cope'}
                    </td>
                    <td className="p-3 sm:p-4 text-slate-600 tracking-normal font-sans">
                      {m.client || (
                        <span className="text-slate-300 italic">nuk ka detaje</span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm('Dëshironi të fshini këtë regjistrim historik? Sasia e stokut nuk do të rregullohet vetiu, vetëm logu do të pastrohet.')) {
                            onDeleteMovement(idx);
                          }
                        }}
                        className="cursor-pointer text-slate-400 hover:text-rose-600 p-1 rounded transition duration-200"
                        title="Fshi regjistrimin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
