/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Filter, ArrowUpDown, Edit, Trash2, FileSpreadsheet, PlusCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Article } from '../types';

interface StockTableProps {
  mergedStock: Array<{
    name: string;
    category: string;
    code?: string;
    quantity?: number;
    unit?: string;
    purchasePrice?: number;
    salePrice?: number;
  }>;
  articles: Article[];
  onDeleteArticle: (code: string) => void;
  onUpdateQuantity: (code: string, newQty: number) => void;
  onQuickImport: (item: { name: string; category: string }) => void;
  onExportToCSV: () => void;
}

export function StockTable({
  mergedStock,
  articles,
  onDeleteArticle,
  onUpdateQuantity,
  onQuickImport,
  onExportToCSV,
}: StockTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [qtyFilter, setQtyFilter] = useState('ALL');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState('');

  // Extract all categories dynamically for filter
  const categories = Array.from(new Set(mergedStock.map((item) => item.category)));

  // Filter items based on search, category and quantity status
  const filteredStock = mergedStock.filter((item) => {
    const codeStr = item.code || '';
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      codeStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    const isTemplate = !item.code;
    const currentQty = item.quantity ?? 0;

    let matchQty = true;
    if (qtyFilter === 'LOW_STOCK') {
      matchQty = !isTemplate && currentQty <= 3;
    } else if (qtyFilter === 'OUT_OF_STOCK') {
      matchQty = !isTemplate && currentQty === 0;
    } else if (qtyFilter === 'IN_STOCK') {
      matchQty = !isTemplate && currentQty > 3;
    } else if (qtyFilter === 'CATALOG') {
      matchQty = isTemplate;
    }

    return matchSearch && matchCategory && matchQty;
  });

  const handleStartEdit = (code: string, currentQty: number) => {
    setEditingCode(code);
    setEditingQty(String(currentQty));
  };

  const handleSaveEdit = (code: string) => {
    const val = Number(editingQty);
    if (isNaN(val) || val < 0) {
      alert('Sasia duhet të jetë një numër pozitiv!');
      return;
    }
    onUpdateQuantity(code, val);
    setEditingCode(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      {/* Header and export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            Statusi i Stokut (Magazina)
            <span className="text-xs bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded-full font-bold border border-slate-200">
              {filteredStock.length} artikuj
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lista e plotë e pjesëve në magazinë dhe modeleve të gatshme
          </p>
        </div>

        <button
          onClick={onExportToCSV}
          className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs font-bold transition duration-200 flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Eksporto CSV (Stoku)
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Kërko artikuj sipas emrit, kategorisë ose kodit SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition duration-200"
          />
        </div>

        <div className="sm:col-span-3 relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition duration-200 appearance-none"
          >
            <option value="ALL">Gjithë Kategoritë</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 relative">
          <AlertCircle className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <select
            value={qtyFilter}
            onChange={(e) => setQtyFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition duration-200 appearance-none"
          >
            <option value="ALL">Gjithë Stoqet</option>
            <option value="LOW_STOCK">Stok i Ulët (≤ 3)</option>
            <option value="OUT_OF_STOCK">Jashtë Stokut (= 0)</option>
            <option value="IN_STOCK">Stoqe të Mjaftueshme (&gt; 3)</option>
            <option value="CATALOG">Vetëm Katalog (Modelet)</option>
          </select>
        </div>
      </div>

      {/* Standard table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table className="w-full text-xs sm:text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
            <tr className="uppercase text-[10px] tracking-wider font-bold">
              <th className="p-4">Kodi SKU</th>
              <th className="p-4">Emri i Artikullit</th>
              <th className="p-4">Kategoria</th>
              <th className="p-4">Gjendja e Stokut</th>
              <th className="p-4">Çmimi Blerjes / Shitjes</th>
              <th className="p-4 text-right">Veprime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStock.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-slate-400">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  Nuk u gjet asnjë artikull me këtë kërkim.
                </td>
              </tr>
            ) : (
              filteredStock.map((item, idx) => {
                const isTemplate = !item.code; // template item has no SKU generated yet
                const currentQty = item.quantity ?? 0;
                const isEditing = editingCode === item.code;

                // Determine stock warning style
                let qtyBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                if (isTemplate) {
                  qtyBadge = 'bg-slate-100 text-slate-400 border border-slate-200';
                } else if (currentQty === 0) {
                  qtyBadge = 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse';
                } else if (currentQty <= 3) {
                  qtyBadge = 'bg-amber-50 text-amber-700 border border-amber-200';
                }

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/70 transition duration-150 ${
                      isTemplate ? 'opacity-85' : ''
                    }`}
                  >
                    {/* SKU Code */}
                    <td className="p-4 font-mono text-[11px] text-slate-600 font-bold">
                      {isTemplate ? (
                        <span className="text-slate-300 block italic">pa regjistruar</span>
                      ) : (
                        item.code
                      )}
                    </td>

                    {/* Name */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.name}</span>
                        {isTemplate && (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded leading-none">
                            Katalog
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-4">
                      <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-bold">
                        {item.category}
                      </span>
                    </td>

                    {/* Quantity in stock */}
                    <td className="p-4 font-mono">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editingQty}
                            onChange={(e) => setEditingQty(e.target.value)}
                            className="w-16 bg-white border border-slate-300 rounded font-bold text-center px-1.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                          <button
                            onClick={() => handleSaveEdit(item.code!)}
                            className="text-[10px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded cursor-pointer hover:bg-slate-800 border border-slate-950 transition"
                          >
                            Ruaj
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold items-center gap-1 ${qtyBadge}`}>
                          {isTemplate ? '0' : currentQty} {item.unit || 'Cope'}
                          {!isTemplate && currentQty === 0 && ' (Jashtë Stokut)'}
                          {!isTemplate && currentQty > 0 && currentQty <= 3 && ' (Stok i Ulët)'}
                        </span>
                      )}
                    </td>

                    {/* Prices */}
                    <td className="p-4 font-mono">
                      {isTemplate ? (
                        <span className="text-slate-300 italic text-xs">Konfigurohet</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-slate-500">
                            Blerje: € {(item.purchasePrice || 0).toFixed(2)}
                          </span>
                          <span className="text-[11px] text-slate-950 font-black">
                            Shitje: € {(item.salePrice || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {isTemplate ? (
                          <button
                            onClick={() => onQuickImport(item)}
                            className="cursor-pointer inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition duration-200"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-amber-500" />
                            Shto në Stok
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(item.code!, currentQty)}
                              className="cursor-pointer text-slate-400 hover:text-amber-500 p-1 rounded-md transition duration-200"
                              title="Përditëso Sasinë"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteArticle(item.code!)}
                              className="cursor-pointer text-slate-400 hover:text-rose-600 p-1 rounded-md transition duration-200"
                              title="Hiq nga inventari"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
