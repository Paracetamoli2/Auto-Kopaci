/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingBag, Plus, Sparkles, Check, Clock, Trash2 } from 'lucide-react';
import { Article, Order, OrderItem } from '../types';

interface OrderFormProps {
  mergedStock: Array<{
    name: string;
    category: string;
    code?: string;
    quantity?: number;
    unit?: string;
    purchasePrice?: number;
  }>;
  orders: Order[];
  pendingOrderItems: OrderItem[];
  setPendingOrderItems: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  onFinalizeOrder: (supplier: string) => void;
  onToggleOrderStatus: (orderId: number) => void;
  suppliers: string[];
}

export function OrderForm({
  mergedStock,
  orders,
  pendingOrderItems,
  setPendingOrderItems,
  onFinalizeOrder,
  onToggleOrderStatus,
  suppliers,
}: OrderFormProps) {
  const [supplier, setSupplier] = useState('Autopasion');
  const [articleName, setArticleName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const handleArticleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setArticleName(name);
    const item = mergedStock.find((a) => a.name === name);
    if (item && item.purchasePrice) {
      setPrice(String(item.purchasePrice));
    } else {
      setPrice('');
    }
  };

  const handleAddToPending = () => {
    if (!articleName || !quantity || Number(quantity) <= 0) return;

    const qty = Number(quantity);
    const itemPrice = Number(price) || 0;
    const selectedItem = mergedStock.find((a) => a.name === articleName);

    const newItem: OrderItem = {
      article: articleName,
      quantity: qty,
      price: itemPrice,
      unit: selectedItem?.unit || 'Cope',
      total: qty * itemPrice,
    };

    setPendingOrderItems([...pendingOrderItems, newItem]);
    setArticleName('');
    setQuantity('');
    setPrice('');
  };

  const handleRemovePending = (idx: number) => {
    setPendingOrderItems(pendingOrderItems.filter((_, i) => i !== idx));
  };

  const handleFinalize = () => {
    if (pendingOrderItems.length === 0) return;
    onFinalizeOrder(supplier);
  };

  const pendingTotal = pendingOrderItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/3 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 sm:p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-800">
            Porosi tek Furnitorët
          </h2>
          <p className="text-xs text-slate-500">Krijo furnizime të reja dhe rrit automatikisht stokun</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Creation Panel */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
              Furnitori i Përzgjedhur *
            </label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition duration-200"
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
              Artikulli nga Katalogu *
            </label>
            <select
              value={articleName}
              onChange={handleArticleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition duration-200"
            >
              <option value="">-- Zgjidh artikullin për porosi --</option>
              {mergedStock.map((a, i) => (
                <option key={i} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Sasia për Porosi
              </label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Çmimi i Blerjes (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition duration-200"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleAddToPending}
              disabled={!articleName || !quantity}
              className="flex-1 cursor-pointer bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed text-slate-700 font-bold py-3 rounded-xl text-xs sm:text-sm transition duration-200 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Shto në Listë
            </button>

            <button
              type="button"
              onClick={handleFinalize}
              disabled={pendingOrderItems.length === 0}
              className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-blue-100"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Krijo Porosinë
            </button>
          </div>

          {pendingOrderItems.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                  Artikujt e Përzgjedhur ({pendingOrderItems.length})
                </p>
                <p className="text-xs font-mono font-bold text-blue-600">
                  Total: €{pendingTotal.toFixed(2)}
                </p>
              </div>
              <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1 text-xs">
                {pendingOrderItems.map((pi, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-2 px-2.5 bg-white border border-slate-200 rounded"
                  >
                    <span className="text-slate-700 font-medium tracking-tight block max-w-[60%] truncate">
                      {pi.article}
                    </span>
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="text-slate-400 text-[10px]">
                        ({pi.quantity}x €{pi.price})
                      </span>
                      <span className="font-bold text-slate-800">
                        €{pi.total.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemovePending(idx)}
                        className="cursor-pointer text-slate-400 hover:text-rose-600 p-0.5 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Existing Lists Panel */}
        <div className="lg:col-span-12 xl:col-span-7 flex flex-col justify-between">
          <div>
            <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-2.5 font-sans">
              Historiku ose Porositë Aktive ({orders.length})
            </p>

            {orders.length === 0 ? (
              <div className="bg-slate-50 text-slate-400 text-sm p-8 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
                <Clock className="w-8 h-8 text-slate-300 mb-1" />
                <span>Nuk ka asnjë porosi të regjistruar deri tani.</span>
                <span className="text-xs text-slate-400">Shtoni artikuj për të filluar blerjen e parë.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-[295px]">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                    <tr className="text-left font-bold uppercase tracking-wider">
                      <th className="p-3">Data / Furnitori</th>
                      <th className="p-3">Artikujt</th>
                      <th className="p-3">Totali</th>
                      <th className="p-3 text-right">Veprime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((o) => (
                      <tr
                        key={o.id}
                        className={`hover:bg-slate-50/70 transition duration-150 ${
                          o.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="p-3">
                          <span className="block font-bold text-slate-800">
                            {o.supplier}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {o.date}
                          </span>
                        </td>
                        <td className="p-3 max-w-[150px] truncate">
                          <span className="text-slate-500 font-medium" title={o.items.map((it) => `${it.article} (x${it.quantity})`).join(', ')}>
                            {o.items.map((it) => `${it.article} (x${it.quantity})`).join(', ')}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">
                          € {o.total.toFixed(2)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onToggleOrderStatus(o.id)}
                            className={`cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition duration-200 ${
                              o.completed
                                ? 'bg-emerald-55 text-emerald-700 border border-emerald-200 bg-emerald-50'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {o.completed ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700 stroke-[3px]" />
                                E Kryer
                              </>
                            ) : (
                              'Marko si e Kryer'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
