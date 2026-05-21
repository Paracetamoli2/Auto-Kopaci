/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Tag, HelpCircle, Layers, Clipboard, AlertCircle, Search, Check } from 'lucide-react';
import { Article, DatabaseItem } from '../types';

interface AddArticleFormProps {
  databaseItems: DatabaseItem[];
  articles: Article[];
  onAddArticle: (article: Article) => void;
  showFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export function AddArticleForm({
  databaseItems,
  articles,
  onAddArticle,
  showFeedback,
}: AddArticleFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('Cope');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const generateCode = (val: string) => {
    return val
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^A-Z0-9\s-]/g, '') // remove special chars
      .replace(/\s+/g, '-');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showFeedback('Ju lutem jepni emrin e artikullit!', 'error');
      return;
    }

    const trimmedName = name.trim();
    const finalCategory = category.trim() || 'Të tjera';

    const exists = articles.some(
      (a) => a.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      showFeedback('Ky artikull ekziston tashmë në stok!', 'error');
      return;
    }

    const generatedCode = generateCode(trimmedName);
    if (!generatedCode) {
      showFeedback('Emri i artikullit përmban karaktere të pavlefshme!', 'error');
      return;
    }

    const articleData: Article = {
      code: generatedCode,
      name: trimmedName,
      category: finalCategory,
      quantity: Number(quantity) || 0,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: Number(salePrice) || 0,
      unit,
      createdAt: new Date().toLocaleString('sq-AL'),
    };

    onAddArticle(articleData);

    // Reset fields
    setName('');
    setCategory('');
    setQuantity('');
    setPurchasePrice('');
    setSalePrice('');
    setUnit('Cope');
    setTemplateSearchQuery('');

    showFeedback('Artikulli i ri u shtua me sukses në stok!', 'success');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 sm:p-2.5 bg-blue-50 rounded-xl text-blue-600">
          <Tag className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-800">
            Regjistro Artikull të Ri
          </h2>
          <p className="text-xs text-slate-500">Shto mallra të reja në inventar dhe përcakto çmimet</p>
        </div>
      </div>

      <div className="mb-5 relative">
        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
          Zgjidh nga Modelet (Katalogu)
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Shkruaj emrin e modelit ose kategorisë për t'u plotësuar vetvetiu..."
            value={templateSearchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            onChange={(e) => {
              setTemplateSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
          />
          <div className="absolute right-3 top-3.5 text-slate-400 pointer-events-none">
            <Search className="w-3.5 h-3.5" />
          </div>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 z-50">
              {databaseItems
                .filter((item) =>
                  item.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                  item.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
                )
                .slice(0, 30)
                .map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setName(item.name);
                      setCategory(item.category);
                      setTemplateSearchQuery(item.name);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 text-slate-800 transition flex justify-between items-center"
                  >
                    <span className="font-medium text-slate-900">{item.name}</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold font-sans">
                      {item.category}
                    </span>
                  </button>
                ))}
              {databaseItems.filter((item) =>
                item.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                item.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
              ).length === 0 && (
                <div className="p-3 text-xs text-slate-400 text-center">Nuk u gjet asnjë model me këtë emër.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Emri i Artikullit *
            </label>
            <input
              type="text"
              required
              placeholder="p.sh. Pllaka Frenash Ate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Kategoria *
            </label>
            <input
              type="text"
              placeholder="p.sh. Sistem Frenimi"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Njësia
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
            >
              <option value="Cope">Cope</option>
              <option value="Liter">Liter</option>
              <option value="Pako">Pako</option>
              <option value="Kuti">Kuti</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Sasia Fillestare
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Çmimi Blerjes (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Çmimi Shitjes (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
            />
          </div>
        </div>

        {name.trim() && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
            <Clipboard className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Kodi i Gjeneruar i Artikullit (SKU)
              </p>
              <p className="text-xs font-mono font-bold text-blue-600 break-all mt-0.5">
                {generateCode(name)}
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white transition duration-200 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 cursor-pointer active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 text-white stroke-[3px]" />
          Shto Artikullin në Stok
        </button>
      </form>
    </div>
  );
}
