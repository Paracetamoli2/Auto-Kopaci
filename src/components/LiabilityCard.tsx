/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Landmark, ArrowRightLeft, CreditCard, ChevronRight, Check } from 'lucide-react';
import { Order, Payment } from '../types';

interface LiabilityCardProps {
  suppliers: string[];
  orders: Order[];
  payments: Payment[];
  onAddPayment: (supplier: string, amount: number) => void;
  showFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export function LiabilityCard({
  suppliers,
  orders,
  payments,
  onAddPayment,
  showFeedback,
}: LiabilityCardProps) {
  const [selectedSupplier, setSelectedSupplier] = useState('Autopasion');
  const [amount, setAmount] = useState('');

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (!amount || Number(amount) <= 0) {
      showFeedback('Shuma e pagesës duhet të jetë më e madhe se 0!', 'error');
      return;
    }

    const value = Number(amount);
    onAddPayment(selectedSupplier, value);
    setAmount('');
    showFeedback(`U regjistrua pagesa prej € ${value.toFixed(2)} për furnitorin ${selectedSupplier}!`, 'success');
  };

  // Helper to compute stats for a supplier
  const getSupplierStats = (s: string) => {
    const totalOrders = orders
      .filter((o) => o.supplier === s && o.completed)
      .reduce((sum, o) => sum + o.total, 0);

    const totalPaid = payments
      .filter((p) => p.supplier === s)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalOrders,
      totalPaid,
      debt: totalOrders - totalPaid,
    };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/3 rounded-full blur-2xl pointer-events-none"></div>

      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 sm:p-2.5 bg-rose-50 rounded-xl text-rose-600">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-800">
              Detyrimet ndaj Furnitorëve
            </h2>
            <p className="text-xs text-slate-500">Balanconi faturat dhe regjistroni pagesat e kryera</p>
          </div>
        </div>

        {/* Suppliers List and Debts */}
        <div className="space-y-3">
          {suppliers.map((s) => {
            const stats = getSupplierStats(s);
            const isNoDebt = stats.debt <= 0;
            return (
              <div
                key={s}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between transition duration-200 hover:border-slate-300"
              >
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    {s}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Faturuar: €{stats.totalOrders.toFixed(2)} | Paguar: €{stats.totalPaid.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-sm sm:text-base font-bold font-mono ${
                      isNoDebt ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    € {stats.debt.toFixed(2)}
                  </span>
                  <p className="text-[9px] text-slate-400 italic font-bold">
                    {isNoDebt ? 'Pa detyrime' : 'Detyrim i mbetur'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Registration Form */}
        <form onSubmit={handleRegisterPayment} className="mt-5 pt-5 border-t border-slate-100 space-y-4">
          <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
            Regjistro Pagesë të Re
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Furnitori
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition duration-200"
              >
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Shuma e Paguar (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition duration-200 rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Konfirmo & Ruaj Pagesën
          </button>
        </form>
      </div>

      {/* Mini ledger of recent payments */}
      {payments.length > 0 && (
        <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-2">
            Pagesat e Fundit
          </p>
          <div className="max-h-[90px] overflow-y-auto space-y-1.5 pr-1 text-[11px]">
            {payments.slice(0, 3).map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 font-medium">{p.supplier}</span>
                </div>
                <div className="font-mono text-slate-500 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{p.date.split(' ')[0]}</span>
                  <span className="font-bold text-emerald-600">- €{p.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
