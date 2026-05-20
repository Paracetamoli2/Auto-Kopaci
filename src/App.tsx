/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wrench,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  Settings,
  HelpCircle,
  Database,
  CheckCircle,
  XCircle,
  TrendingDown,
  Activity,
  Landmark,
  ShoppingBag
} from 'lucide-react';

// Import Types
import { Article, DatabaseItem, Movement, Order, OrderItem, Payment } from './types';

// Import Custom Modular Components
import { StatsGrid } from './components/StatsGrid';
import { AddArticleForm } from './components/AddArticleForm';
import { MovementForm } from './components/MovementForm';
import { StockTable } from './components/StockTable';
import { OrderForm } from './components/OrderForm';
import { LiabilityCard } from './components/LiabilityCard';
import { MovementHistory } from './components/MovementHistory';
import { SheetsPanel } from './components/SheetsPanel';

const DATABASE_ITEMS: DatabaseItem[] = [
  { name: 'Vaj Motorri 5W30', category: 'Lubrifikant' },
  { name: 'Vaj Motorri 10W40', category: 'Lubrifikant' },
  { name: 'Filter Vaji', category: 'Filtra' },
  { name: 'Filter Ajri', category: 'Filtra' },
  { name: 'Filter Karburanti', category: 'Filtra' },
  { name: 'Pllaka Frenash', category: 'Sistem Frenimi' },
  { name: 'Disk Frenash', category: 'Sistem Frenimi' },
  { name: 'Fshirëse Xhami', category: 'Aksesore' },
  { name: 'Akumulator 60Ah', category: 'Elektrike' },
  { name: 'Kandela', category: 'Motor' }
];

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // DB Sync Status
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // UI state
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [pendingOrderItems, setPendingOrderItems] = useState<OrderItem[]>([]);
  const [pendingMovementItems, setPendingMovementItems] = useState<Movement[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [activePanel, setActivePanel] = useState<'NONE' | 'LIABILITIES' | 'ORDERS' | 'HISTORY' | 'SHEETS'>('NONE');

  // Load and Migrate State from SQLite
  useEffect(() => {
    const initDbState = async () => {
      try {
        const response = await fetch('/api/state');
        if (!response.ok) throw new Error('Dështoi komunikimi me serverin.');
        const data = await response.json();

        // Check if DB is brand new/empty, and check if user has local items to migrate
        const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
        const localMovements = JSON.parse(localStorage.getItem('movements') || '[]');
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        const localPayments = JSON.parse(localStorage.getItem('payments') || '[]');

        const hasLocalData = localArticles.length > 0 || localMovements.length > 0 || localOrders.length > 0 || localPayments.length > 0;

        if ((!data.articles || data.articles.length === 0) && hasLocalData) {
          // Sync localStorage data into SQLite database as a one-time migration
          const syncRes = await fetch('/api/sync/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              articles: localArticles,
              movements: localMovements,
              orders: localOrders,
              payments: localPayments
            })
          });

          if (syncRes.ok) {
            setArticles(localArticles);
            setMovements(localMovements);
            setOrders(localOrders);
            setPayments(localPayments);
            showFeedback('Sukses: Të dhënat tuaja u transferuan automatikisht në bazën e të dhënave SQLite!', 'success');
          } else {
            throw new Error('Migrimi dështoi.');
          }
        } else {
          // Success case - Populate state directly from SQLite
          setArticles(data.articles || []);
          setMovements(data.movements || []);
          setOrders(data.orders || []);
          setPayments(data.payments || []);
        }
        setIsDbLoaded(true);
      } catch (err) {
        console.error('SQLite Sync Error, falling back to offline localStorage caching:', err);
        // Direct safe fallback from localStorage cache
        setArticles(JSON.parse(localStorage.getItem('articles') || '[]'));
        setMovements(JSON.parse(localStorage.getItem('movements') || '[]'));
        setOrders(JSON.parse(localStorage.getItem('orders') || '[]'));
        setPayments(JSON.parse(localStorage.getItem('payments') || '[]'));
        setIsDbLoaded(true);
      }
    };
    initDbState();
  }, []);

  // Sync to local storage for offline resiliency cache
  useEffect(() => {
    if (isDbLoaded) {
      localStorage.setItem('articles', JSON.stringify(articles));
    }
  }, [articles, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) {
      localStorage.setItem('movements', JSON.stringify(movements));
    }
  }, [movements, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) {
      localStorage.setItem('orders', JSON.stringify(orders));
    }
  }, [orders, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) {
      localStorage.setItem('payments', JSON.stringify(payments));
    }
  }, [payments, isDbLoaded]);

  // Local clock sync (without causing infinite loops)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic status/toast feedback helper
  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ msg, type });
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  };

  // Re-build mergedStock to display both preset catalog items and customized stock values
  const mergedStock = [...DATABASE_ITEMS].map(item => {
    // Check if item is already added in the articles list
    const activeArt = articles.find(a => a.name.toLowerCase() === item.name.toLowerCase());
    if (activeArt) {
      return {
        name: activeArt.name,
        category: activeArt.category,
        code: activeArt.code,
        quantity: activeArt.quantity,
        unit: activeArt.unit,
        purchasePrice: activeArt.purchasePrice,
        salePrice: activeArt.salePrice,
      };
    }
    return {
      name: item.name,
      category: item.category,
      code: undefined,
      quantity: undefined,
      unit: 'Cope',
      purchasePrice: undefined,
      salePrice: undefined,
    };
  });

  // Adding other custom user articles that aren't inside the predefined items database
  articles.forEach(a => {
    const isAlreadyPresent = DATABASE_ITEMS.some(item => item.name.toLowerCase() === a.name.toLowerCase());
    if (!isAlreadyPresent) {
      mergedStock.push({
        name: a.name,
        category: a.category,
        code: a.code,
        quantity: a.quantity,
        unit: a.unit,
        purchasePrice: a.purchasePrice,
        salePrice: a.salePrice,
      });
    }
  });

  // Master KPI computations
  const totalStockValue = articles.reduce((sum, a) => sum + (a.quantity * a.purchasePrice), 0);
  const lowStockItemsCount = articles.filter(a => a.quantity <= 3).length;
  const pendingOrdersCount = orders.filter(o => !o.completed).length;

  // Database state sync & refresh helper
  const refreshState = async () => {
    try {
      const response = await fetch('/api/state');
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
        setMovements(data.movements || []);
        setOrders(data.orders || []);
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Error refreshing state from database:', err);
    }
  };

  // Handler functions
  const handleAddArticle = async (newArt: Article) => {
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArt)
      });
      if (!res.ok) throw new Error();
      await refreshState();
      showFeedback(`Artikulli '${newArt.name}' u regjistrua me sukses!`, 'success');
    } catch {
      showFeedback('Gabim gjatë ruajtjes së artikullit në bazën e të dhënave SQLite.', 'error');
    }
  };

  const handleDeleteArticle = async (code: string) => {
    const article = articles.find(a => a.code === code);
    if (!article) return;
    
    if (confirm(`A jeni të sigurt që dëshironi të fshini artikullin '${article.name}'? Regjistrimet historike të lëvizjeve do të mbeten.`)) {
      try {
        const res = await fetch(`/api/articles/${code}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        await refreshState();
        showFeedback(`Artikulli '${article.name}' u hoq me sukses.`, 'success');
      } catch {
        showFeedback('Dështoi fshirja e artikullit nga SQLite.', 'error');
      }
    }
  };

  const handleUpdateQuantity = async (code: string, newQty: number) => {
    try {
      const res = await fetch(`/api/articles/${code}/quantity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
      });
      if (!res.ok) throw new Error();
      await refreshState();
      showFeedback('Sasia e artikullit u përditësua në stok!', 'success');
    } catch {
      showFeedback('Dështoi përditësimi i sasisë në SQLite.', 'error');
    }
  };

  const handleQuickImport = async (item: { name: string; category: string }) => {
    const code = item.name.toUpperCase().replace(/\s+/g, '-');
    
    // Safety check
    if (articles.some(a => a.code === code)) {
      showFeedback('Artikulli është tashmë aktiv në magazinë!', 'error');
      return;
    }

    const defaultArt: Article = {
      code,
      name: item.name,
      category: item.category,
      quantity: 0,
      purchasePrice: 0,
      salePrice: 0,
      unit: 'Cope',
      createdAt: new Date().toLocaleString('sq-AL'),
    };

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultArt)
      });
      if (!res.ok) throw new Error();
      await refreshState();
      showFeedback(`U aktivizua '${item.name}' në stok me sasi fillestare 0.`, 'success');
    } catch {
      showFeedback('Dështoi aktivizimi i artikullit në SQLite.', 'error');
    }
  };

  const handleExportToCSV = () => {
    const headers = ["Kodi SKU", "Emri i Artikullit", "Sasia", "Njesia", "Cmimi i Blerjes (€)", "Cmimi i Shitjes (€)", "Kategoria"];
    const rows = mergedStock
      .filter(item => item.code) // only export real physical items that are registered
      .map(item => [
        item.code || '-',
        item.name,
        item.quantity || 0,
        item.unit || 'Cope',
        item.purchasePrice || 0,
        item.salePrice || 0,
        item.category || '-'
      ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    // Prepend UTF-8 Byte Order Mark (BOM) for correct Albanian letter rendering inside Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stoku_pjesesh_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showFeedback('Eksportimi në CSV u krye me sukses!', 'success');
  };

  const handleFinalizeOrder = async (supplierName: string) => {
    if (pendingOrderItems.length === 0) return;

    const newOrder: Order = {
      id: Date.now(),
      supplier: supplierName,
      items: pendingOrderItems,
      date: new Date().toLocaleString('sq-AL'),
      completed: false,
      total: pendingOrderItems.reduce((sum, item) => sum + item.total, 0),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (!res.ok) throw new Error();
      await refreshState();
      setPendingOrderItems([]);
      showFeedback(`U regjistrua porosia e re me vlerë € ${newOrder.total.toFixed(2)}!`, 'success');
    } catch {
      showFeedback('Dështoi regjistrimi i porosisë në SQLite.', 'error');
    }
  };

  const handleToggleOrderStatus = async (orderId: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error();
      await refreshState();
      showFeedback(`Porosia u pranua! Sasia përkatëse u rrit në stok automatikisht.`, 'success');
    } catch {
      showFeedback('Dështoi pranimi i porosisë në SQLite.', 'error');
    }
  };

  const handleRegisterMovements = async () => {
    if (pendingMovementItems.length === 0) return;

    // Safety checks on quantities inside database loaded cache
    let hasError = false;
    pendingMovementItems.forEach(m => {
      const activeArt = articles.find(a => a.code === m.articleCode);
      if (!activeArt) {
        showFeedback(`Gabim: Artikulli ${m.articleCode} nuk u gjet!`, 'error');
        hasError = true;
        return;
      }
      if (m.type === 'DALJE' && activeArt.quantity < m.quantity) {
        showFeedback(`Gabim: Stoku për '${activeArt.name}' është i pamjaftueshëm!`, 'error');
        hasError = true;
        return;
      }
    });

    if (hasError) return;

    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingMovementItems)
      });
      if (!res.ok) throw new Error();
      await refreshState();
      setPendingMovementItems([]);
      showFeedback('Lëvizjet e regjistruara u ruajtën dhe sasia e stokut u përditësua.', 'success');
    } catch {
      showFeedback('Dështoi regjistrimi i lëvizjeve në SQLite.', 'error');
    }
  };

  const handleAddPayment = async (supplier: string, amount: number) => {
    const newPayment = {
      supplier,
      amount,
      date: new Date().toLocaleString('sq-AL'),
    };

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });
      if (!res.ok) throw new Error();
      await refreshState();
    } catch {
      showFeedback('Dështoi regjistrimi i pagesës në SQLite.', 'error');
    }
  };

  const handleDeleteMovement = async (idx: number) => {
    const m = movements[idx];
    if (!m || (m as any).id === undefined) {
      setMovements(prev => prev.filter((_, i) => i !== idx));
      showFeedback('Regjistrimi i lëvizjes u hoq lokal.', 'success');
      return;
    }

    try {
      const res = await fetch(`/api/movements/${(m as any).id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await refreshState();
      showFeedback('Regjistrimi i lëvizjes u hoq nga logu historik.', 'success');
    } catch {
      showFeedback('Dështoi heqja e lëvizjes nga SQLite.', 'error');
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch('/api/movements/clear', { method: 'POST' });
      if (!res.ok) throw new Error();
      await refreshState();
      showFeedback('Historiku i lëvizjeve u fshi plotësisht.', 'success');
    } catch {
      showFeedback('Dështoi fshirja e lëvizjeve nga SQLite.', 'error');
    }
  };

  const handleImportArticles = async (imported: Article[]) => {
    try {
      const res = await fetch('/api/sync/sheets-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imported)
      });
      if (!res.ok) throw new Error();
      await refreshState();
    } catch {
      showFeedback('Gabim gjatë sinkronizimit të importit me SQLite.', 'error');
    }
  };

  const suppliers = ['Autopasion', 'Intercars', 'Te tjera'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Feedbacks */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div
              className={`p-4 rounded-xl shadow-xl border backdrop-blur-md flex items-start gap-3 ${
                feedback.type === 'error'
                  ? 'bg-white border-rose-350 border text-rose-800'
                  : 'bg-white border-emerald-350 border text-slate-800'
              }`}
            >
              <div className="mt-0.5">
                {feedback.type === 'error' ? (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {feedback.type === 'error' ? 'Gabim / Kujdes' : 'Sistemi Informativ'}
                </p>
                <p className="text-sm mt-0.5 leading-relaxed font-semibold">{feedback.msg}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        
        {/* Navigation / Header bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-650 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/10 text-white">
              <Wrench className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-800">
                  AUTO SERVIS
                </h1>
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                  v3.0 - Magazina & Financa
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium font-sans">
                Sistemi Profesional për Menaxhimin e Inventarit të Pjesëve të Këmbimit
              </p>
            </div>
          </div>

          {/* Time indicator */}
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>2026-05-20</span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-blue-600">{currentTime || 'Ora...'}</span>
          </div>
        </header>

        {/* Top level global Alerts */}
        {lowStockItemsCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start sm:items-center justify-between gap-3 text-xs leading-relaxed text-amber-800 flex-wrap">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 sm:mt-0 shrink-0" />
              <div>
                <span className="font-bold">Vëmendje: Ka artikuj me stoqe të ulta! </span>
                {lowStockItemsCount} artikuj në magazinë kanë 3 ose më pak njësi gjendje. Ju lutemi kryeni porosi tek furnitorët.
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>Gjendja po monitorohet në kohë reale</span>
            </div>
          </div>
        )}

        {/* Global KPIs Panel */}
        <StatsGrid
          mergedStockCount={mergedStock.length}
          movementsCount={movements.length}
          totalStockValue={totalStockValue}
          lowStockItemsCount={lowStockItemsCount}
          pendingOrdersCount={pendingOrdersCount}
        />

        {/* Quick Management Panels Navigation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/3 rounded-full blur-2xl pointer-events-none"></div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Panelet e Shpejta të Menaxhimit</h3>
            <p className="text-xs text-slate-500">Klikoni mbi butonat për të hapur ose mbyllur secilin modul menaxhues</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setActivePanel(activePanel === 'LIABILITIES' ? 'NONE' : 'LIABILITIES')}
              className={`flex-1 sm:flex-none cursor-pointer text-xs font-bold py-2.5 px-4 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 ${
                activePanel === 'LIABILITIES'
                  ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <Landmark className="w-4 h-4 shrink-0" />
              Detyrimet e Furnitorëve
            </button>

            <button
              onClick={() => setActivePanel(activePanel === 'ORDERS' ? 'NONE' : 'ORDERS')}
              className={`flex-1 sm:flex-none cursor-pointer text-xs font-bold py-2.5 px-4 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 ${
                activePanel === 'ORDERS'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              Porositë e Furnizimit
            </button>

            <button
              onClick={() => setActivePanel(activePanel === 'HISTORY' ? 'NONE' : 'HISTORY')}
              className={`flex-1 sm:flex-none cursor-pointer text-xs font-bold py-2.5 px-4 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 ${
                activePanel === 'HISTORY'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              Historiku i Lëvizjeve
            </button>

            <button
              onClick={() => setActivePanel(activePanel === 'SHEETS' ? 'NONE' : 'SHEETS')}
              className={`flex-1 sm:flex-none cursor-pointer text-xs font-bold py-2.5 px-4 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 ${
                activePanel === 'SHEETS'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600" />
              Google Sheets
            </button>
          </div>
        </div>

        {/* Dynamic Expandable Panels with smooth animation */}
        <AnimatePresence mode="wait">
          {activePanel !== 'NONE' && (
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {activePanel === 'LIABILITIES' && (
                <div className="pb-2">
                  <LiabilityCard
                    suppliers={suppliers}
                    orders={orders}
                    payments={payments}
                    onAddPayment={handleAddPayment}
                    showFeedback={showFeedback}
                  />
                </div>
              )}
              {activePanel === 'ORDERS' && (
                <div className="pb-2">
                  <OrderForm
                    mergedStock={mergedStock}
                    orders={orders}
                    pendingOrderItems={pendingOrderItems}
                    setPendingOrderItems={setPendingOrderItems}
                    onFinalizeOrder={handleFinalizeOrder}
                    onToggleOrderStatus={handleToggleOrderStatus}
                    suppliers={suppliers}
                  />
                </div>
              )}
              {activePanel === 'HISTORY' && (
                <div className="pb-2">
                  <MovementHistory
                    movements={movements}
                    onDeleteMovement={handleDeleteMovement}
                    onClearHistory={handleClearHistory}
                  />
                </div>
              )}
              {activePanel === 'SHEETS' && (
                <div className="pb-2">
                  <SheetsPanel
                    mergedStock={mergedStock}
                    onImportArticles={handleImportArticles}
                    showFeedback={showFeedback}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Middle level: Quick Transaction Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Article Form */}
          <AddArticleForm
            databaseItems={DATABASE_ITEMS}
            articles={articles}
            onAddArticle={handleAddArticle}
            showFeedback={showFeedback}
          />

          {/* Movement registrar (Hyrje/Dalje) Form */}
          <MovementForm
            mergedStock={mergedStock}
            articles={articles}
            pendingMovements={pendingMovementItems}
            setPendingMovements={setPendingMovementItems}
            onRegisterMovements={handleRegisterMovements}
          />
        </div>

        {/* Bottom level: Main Stocks Table view */}
        <StockTable
          mergedStock={mergedStock}
          articles={articles}
          onDeleteArticle={handleDeleteArticle}
          onUpdateQuantity={handleUpdateQuantity}
          onQuickImport={handleQuickImport}
          onExportToCSV={handleExportToCSV}
        />
        <footer className="text-center text-slate-400 text-[10px] sm:text-xs pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="font-bold font-mono text-slate-500">
            AUTO SERVIS INVENTARI — Menaxhim i Sigurt Lokal (LocalStorage)
          </p>
          <div className="flex items-center gap-1.5 text-slate-400 font-mono">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>Sistemi është plotësisht funksional dhe i mbrojtur offline</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
