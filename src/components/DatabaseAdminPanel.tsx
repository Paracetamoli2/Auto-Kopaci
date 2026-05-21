/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, 
  Trash2, 
  Trash, 
  Layers, 
  ArrowRightLeft, 
  Landmark, 
  ShoppingBag, 
  CreditCard, 
  AlertTriangle,
  FolderOpen,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { Article, Movement, Order, Payment } from '../types';

interface DatabaseAdminPanelProps {
  articles: Article[];
  movements: Movement[];
  orders: Order[];
  payments: Payment[];
  onRefresh: () => Promise<void>;
  showFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export function DatabaseAdminPanel({
  articles,
  movements,
  orders,
  payments,
  onRefresh,
  showFeedback,
}: DatabaseAdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('db_admin_authenticated') === 'true';
  });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'ARTICLES' | 'MOVEMENTS' | 'LIABILITIES'>('ARTICLES');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Albertkopaci12@') {
      setIsAuthenticated(true);
      sessionStorage.setItem('db_admin_authenticated', 'true');
      setPasswordError('');
      showFeedback('U identifikuat me sukses në panelin administrativ!', 'success');
    } else {
      setPasswordError('Fjalëkalimi i vendosur është i pasaktë! Provojeni përsëri.');
    }
  };

  // Group categories dynamically
  const categoriesMap = articles.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categories = Object.keys(categoriesMap);

  // Group suppliers dynamically from both orders and payments
  const suppliersFromOrders = orders.map(o => o.supplier);
  const suppliersFromPayments = payments.map(p => p.supplier);
  const suppliers = Array.from(new Set(['Autopasion', 'Intercars', 'Te tjera', ...suppliersFromOrders, ...suppliersFromPayments]));

  // Handle single deletion
  const handleDeleteItem = async (type: 'articles' | 'movements' | 'orders' | 'payments', idOrCode: string | number, label: string) => {
    const confirmMessage = `A jeni i sigurt që dëshironi të fshini këtë rekord (${label}) nga databaza?`;
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      let url = '';
      let method = 'DELETE';
      if (type === 'articles') {
        url = `/api/articles/${encodeURIComponent(idOrCode)}`;
      } else if (type === 'movements') {
        url = `/api/movements/${idOrCode}`;
      } else if (type === 'orders') {
        url = `/api/orders/${idOrCode}`;
      } else if (type === 'payments') {
        url = `/api/payments/${idOrCode}`;
      }

      const res = await fetch(url, { method });
      if (!res.ok) throw new Error();
      await onRefresh();
      showFeedback(`U fshi me sukses: ${label}`, 'success');
    } catch (err) {
      console.error(err);
      showFeedback(`Dështoi fshirja e rekordit: ${label}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk category/supplier deletion
  const handleBulkDelete = async (
    type: 'articles' | 'movements' | 'orders' | 'payments',
    filterType: 'category' | 'all' | 'single',
    filterValue: string,
    description: string
  ) => {
    const confirmation = window.confirm(
      `PARALAJMËRIM: A jeni absolutisht të sigurt që dëshironi dhe keni dritën jeshile për të fshirë në masë: ${description}?\nKy hap nuk mund të kthehet pas!`
    );
    if (!confirmation) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, filterType, filterValue })
      });
      if (!res.ok) throw new Error();
      await onRefresh();
      showFeedback(`Sukses: U realizua fshirja për ${description}`, 'success');
    } catch (err) {
      console.error(err);
      showFeedback(`Dështoi fshirja në masë për ${description}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-md relative overflow-hidden flex flex-col items-center justify-center min-h-[380px] max-w-md mx-auto my-4 transition duration-200 animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500"></div>
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="p-4 bg-rose-50 border border-rose-100 rounded-full text-rose-600 mb-5 relative shrink-0">
          <Lock className="w-8 h-8 stroke-[2.2]" />
          <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 border border-white text-white rounded-full">
            <KeyRound className="w-3 h-3 stroke-[2.5]" />
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-black text-slate-800 text-center tracking-tight">
          Autorizim i Kërkuar ⚙️
        </h3>
        <p className="text-xs text-slate-500 text-center mt-2 mb-6 max-w-[285px] leading-relaxed">
          Për të hapur panelin administrativ dhe për të bërë fshirje artikujsh, lëvizjesh apo detyrimesh, ju lutem shkruani fjalëkalimin e sigurisë.
        </p>

        <form onSubmit={handleVerifyPassword} className="w-full space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Shkruaj fjalëkalimin këtu..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition duration-150 text-center font-semibold"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-650 cursor-pointer focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {passwordError && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100/60 p-3 rounded-xl">
              <ShieldAlert className="w-4 h-4 shrink-0 stroke-[2.2]" />
              <span className="font-medium text-left leading-normal">{passwordError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold leading-none tracking-wider uppercase shadow-md shadow-rose-100/60 font-sans cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Hyr në Panel</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden h-full flex flex-col">
      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Database className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">Paneli Administrativ i Databazës</h3>
            <p className="text-[11px] text-slate-500">Kërkoni, filtroni dhe fshini të dhënat e plota sipas kategorive ose individualisht</p>
          </div>
        </div>

        {/* Action picker */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto shadow-inner">
          <button
            onClick={() => { setActiveSubTab('ARTICLES'); setSearchQuery(''); }}
            className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'ARTICLES' ? 'bg-white text-rose-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Artikujt (Stoku)</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('MOVEMENTS'); setSearchQuery(''); }}
            className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'MOVEMENTS' ? 'bg-white text-rose-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Veprimet (Historiku)</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('LIABILITIES'); setSearchQuery(''); }}
            className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'LIABILITIES' ? 'bg-white text-rose-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Detyrimet & Financat</span>
          </button>
        </div>
      </div>

      {/* Global search filter */}
      <div className="mb-5 relative">
        <input
          type="text"
          placeholder="🔍 Kërko sipas emrit, kategorisë ose furnitorit..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition"
        />
        <div className="absolute left-3.5 top-3 text-slate-400">
          <Search className="w-4 h-4" />
        </div>
      </div>

      {/* SUB-PANEL 1: ARTICLES */}
      {activeSubTab === 'ARTICLES' && (
        <div className="space-y-6">
          {/* Categories Grid Management */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Fshirje sipas Kategorisë</h4>
            
            {categories.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4 italic">Nuk ka asnjë kategori aktive për t'u shfaqur.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {categories
                  .filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(cat => {
                    const count = categoriesMap[cat];
                    return (
                      <div key={cat} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between transition-all hover:bg-slate-100/50">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-800 block truncate max-w-[120px]">{cat}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{count} artikuj në stok</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBulkDelete('articles', 'category', cat, `Kategorinë '${cat}' (${count} artikuj)`)}
                          disabled={isDeleting}
                          title={`Fshi të gjithë artikujt në kategorinë ${cat}`}
                          className="cursor-pointer p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition-transform hover:scale-105 shadow-xs disabled:opacity-50"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Individual Articles Management List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Të gjithë Artikujt Aktualë</h4>
              <button
                type="button"
                onClick={() => handleBulkDelete('articles', 'all', '', 'TË GJIHË artikujt në stok')}
                disabled={isDeleting || articles.length === 0}
                className="cursor-pointer text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Pastro Stokun Plotësisht</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="p-3">Kodi (SKU)</th>
                    <th className="p-3">Artikulli</th>
                    <th className="p-3">Kategoria</th>
                    <th className="p-3">Sasia</th>
                    <th className="p-3 text-right">Veprime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articles
                    .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.category.toLowerCase().includes(searchQuery.toLowerCase()) || a.code.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(art => (
                      <tr key={art.code} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 font-mono font-bold text-slate-600">{art.code}</td>
                        <td className="p-3 font-bold text-slate-900">{art.name}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            {art.category}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-600">{art.quantity} {art.unit}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem('articles', art.code, art.name)}
                            disabled={isDeleting}
                            className="cursor-pointer p-1.5 text-rose-650 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {articles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">Asnjë artikull nuk u gjet ose nuk është regjistruar në stok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PANEL 2: MOVEMENTS */}
      {activeSubTab === 'MOVEMENTS' && (
        <div className="space-y-6">
          {/* Quick Filter Bulk Actions */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Fshirje Lëvizjesh sipas Kategorive</h4>
            
            {categories.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4 italic">Nuk ka asnjë kategori aktive për t'u shfaqur.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {categories
                  .filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(cat => {
                    const matchingMovementsCount = movements.filter(m => {
                      const matchingArt = articles.find(a => a.code === m.articleCode);
                      return matchingArt && matchingArt.category === cat;
                    }).length;

                    return (
                      <div key={cat} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between transition-all hover:bg-slate-100/50">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-rose-50 text-rose-650 rounded-lg">
                            <ArrowRightLeft className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-800 block truncate max-w-[120px]">{cat}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{matchingMovementsCount} lëvizje regjistruar</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBulkDelete('movements', 'category', cat, `Veprimet/Lëvizjet e kategorisë '${cat}' (${matchingMovementsCount} veprime)`)}
                          disabled={isDeleting || matchingMovementsCount === 0}
                          title={`Fshi lëvizjet për artikujt e kategorisë ${cat}`}
                          className="cursor-pointer p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition-transform hover:scale-105 shadow-xs disabled:opacity-50 disabled:hover:bg-rose-50 disabled:hover:text-rose-650"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* List of movements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Logu i Plotë i Veprimeve</h4>
              <button
                type="button"
                onClick={() => handleBulkDelete('movements', 'all', '', 'TË GJITHA verprimet dhe loget historike')}
                disabled={isDeleting || movements.length === 0}
                className="cursor-pointer text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Pastro Veprimet Plotësisht</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="p-3">Data</th>
                    <th className="p-3">Kodi Pjesës</th>
                    <th className="p-3">Modeli</th>
                    <th className="p-3">Lloji</th>
                    <th className="p-3">Sasia</th>
                    <th className="p-3">Klienti / Detaje</th>
                    <th className="p-3 text-right">Veprime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {movements
                    .filter(m => m.articleCode.toLowerCase().includes(searchQuery.toLowerCase()) || (m.client || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.repairNo || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((m, idx) => {
                      const isDalje = m.type === 'DALJE';
                      const artObj = articles.find(a => a.code === m.articleCode);
                      return (
                        <tr key={(m as any).id || idx} className="hover:bg-slate-50/50 transition">
                          <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{m.date}</td>
                          <td className="p-3 font-mono font-bold text-slate-700">{m.articleCode}</td>
                          <td className="p-3 font-bold text-slate-900">{artObj ? artObj.name : 'Veprim i mbetur'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              isDalje ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {m.type}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">{m.quantity} {m.unit || 'Cope'}</td>
                          <td className="p-3 text-slate-500 truncate max-w-[150px]">
                            {m.client || m.repairNo ? `${m.client || ''} ${m.repairNo ? `[Karta: ${m.repairNo}]` : ''}` : '-'}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem('movements', (m as any).id, `Veprimi ${m.articleCode} - ${m.type} sasi ${m.quantity}`)}
                              disabled={isDeleting}
                              className="cursor-pointer p-1.5 text-rose-650 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">Asnjë lëvizje nuk u gjet ose nuk është regjistruar në historik.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PANEL 3: LIABILITIES */}
      {activeSubTab === 'LIABILITIES' && (
        <div className="space-y-6">
          {/* Supplier Grid Actions */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Fshirje Financash/Detyrimesh sipas Furnitorit</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {suppliers
                .filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(sup => {
                  const matchingOrders = orders.filter(o => o.supplier === sup);
                  const matchingPayments = payments.filter(p => p.supplier === sup);

                  return (
                    <div key={sup} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between hover:bg-slate-100/50 transition">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Landmark className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold text-xs text-slate-900">{sup}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Porosi: {matchingOrders.length} fletë | Pagesat: {matchingPayments.length} të loguara
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => handleBulkDelete('orders', 'category', sup, `fletë porositë për furnitorin '${sup}'`)}
                          disabled={isDeleting || matchingOrders.length === 0}
                          className="flex-1 text-[10px] bg-indigo-50 hover:bg-rose-500 text-indigo-700 hover:text-white font-bold py-1 px-2.5 rounded-lg border border-indigo-100 hover:border-transparent transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 font-sans"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Fshi Porositë</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkDelete('payments', 'category', sup, `çdo pagesë të regjistruar për furnitorin '${sup}'`)}
                          disabled={isDeleting || matchingPayments.length === 0}
                          className="flex-1 text-[10px] bg-emerald-50 hover:bg-rose-500 text-emerald-700 hover:text-white font-bold py-1 px-2.5 rounded-lg border border-emerald-100 hover:border-transparent transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 font-sans"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Fshi Pagesat</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Supplier Orders Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders Management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Fletët e Pororisë aktive</h4>
                <button
                  type="button"
                  onClick={() => handleBulkDelete('orders', 'all', '', 'TË GJITHA fletë-porositë e sistemit')}
                  disabled={isDeleting || orders.length === 0}
                  className="cursor-pointer text-[10px] text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold px-2 py-1 rounded-lg border border-rose-100 flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Pastro Porositë</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">Furnitori / Data</th>
                      <th className="p-2.5">Vlera Totale</th>
                      <th className="p-2.5">Statusi</th>
                      <th className="p-2.5 text-right">Veprime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders
                      .filter(o => o.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(o => (
                        <tr key={o.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-2.5">
                            <span className="font-bold text-slate-800 block text-xs">{o.supplier}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{o.date}</span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">€ {o.total.toFixed(2)}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              o.completed ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {o.completed ? 'Pranuar' : 'E hapur'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem('orders', o.id, `Porosia furnitorit ${o.supplier} vlerë € ${o.total.toFixed(2)}`)}
                              disabled={isDeleting}
                              className="cursor-pointer p-1.5 text-rose-655 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400 italic">Asnjë fletë-porosi e regjistruar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments Management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Pagesat e Dokumentuara</h4>
                <button
                  type="button"
                  onClick={() => handleBulkDelete('payments', 'all', '', 'TË GJITHA pagesat e regjistruara')}
                  disabled={isDeleting || payments.length === 0}
                  className="cursor-pointer text-[10px] text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold px-2 py-1 rounded-lg border border-rose-100 flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Pastro Pagesat</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">Furnitori / Data</th>
                      <th className="p-2.5">Shuma Paguar</th>
                      <th className="p-2.5 text-right">Veprime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments
                      .filter(p => p.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-2.5">
                            <span className="font-bold text-slate-800 block text-xs">{p.supplier}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{p.date}</span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-emerald-600">€ {p.amount.toFixed(2)}</td>
                          <td className="p-2.5 text-right flex items-center justify-end gap-1.5 h-full pt-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem('payments', p.id, `Pagesa për ${p.supplier} me vlerë € ${p.amount.toFixed(2)}`)}
                              disabled={isDeleting}
                              className="cursor-pointer p-1.5 text-rose-655 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-400 italic">Asnjë pagesë e dokumentuar për faturat e furnizimit.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database sync feedback footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-2.5 border border-amber-200 text-[11px] text-amber-800 max-w-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p>
            <strong>Vërejtje Kujdesi:</strong> Ndryshimet dhe fshirjet e bëra në këtë strukturë sinkronizohen direkt me serverin dhe skedarin e plotë SQLite. Ju lutem sigurohuni para se të kryeni operacione fshirjeje në masë.
          </p>
        </div>
        
        <button
          type="button"
          onClick={async () => {
            setIsDeleting(true);
            await onRefresh();
            setIsDeleting(false);
            showFeedback("Baza e të dhënave u ri-freskua me sukses!", "success");
          }}
          disabled={isDeleting}
          className="cursor-pointer flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-xs transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDeleting ? 'animate-spin' : ''}`} />
          <span>Rifresko Të Dhënat</span>
        </button>
      </div>
    </div>
  );
}
