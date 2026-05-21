/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  User, 
  Search, 
  Filter, 
  ClipboardList, 
  ShoppingBag, 
  DollarSign, 
  Briefcase, 
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Clock,
  ChevronLeft
} from 'lucide-react';
import { Article, Movement } from '../types';

interface SalesDashboardProps {
  articles: Article[];
  movements: Movement[];
}

// Albanian month names mapping
const MONTHS_ALB: Record<string, string> = {
  '01': 'Janar',
  '02': 'Shkurt',
  '03': 'Mars',
  '04': 'Prill',
  '05': 'Maj',
  '06': 'Qershor',
  '07': 'Korrik',
  '08': 'Gusht',
  '09': 'Shtator',
  '10': 'Tetor',
  '11': 'Nëntor',
  '12': 'Dhjetor',
};

// Formatting helper for currency in Euro
const formatEuro = (value: number) => {
  return '€ ' + (value || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Robust helper to parse movement dates for grouping
function parseMovementDate(dateStr?: string) {
  const fallback = new Date();
  if (!dateStr) {
    const y = fallback.getFullYear();
    const m = fallback.getMonth() + 1;
    const d = fallback.getDate();
    const mm = m < 10 ? `0${m}` : `${m}`;
    const dd = d < 10 ? `0${d}` : `${d}`;
    return {
      dayStr: `${y}-${mm}-${dd}`,
      monthStr: `${y}-${mm}`,
      year: y,
      monthVal: m,
      dayVal: d
    };
  }

  // Parse formats like "21.5.2026, 11:42:04", "21/05/2026, 11:42:04"
  const parts = dateStr.match(/^(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/);
  if (parts) {
    const d = parseInt(parts[1], 10);
    const m = parseInt(parts[2], 10);
    const y = parseInt(parts[3], 10);
    const mm = m < 10 ? `0${m}` : `${m}`;
    const dd = d < 10 ? `0${d}` : `${d}`;
    return {
      dayStr: `${y}-${mm}-${dd}`,
      monthStr: `${y}-${mm}`,
      year: y,
      monthVal: m,
      dayVal: d
    };
  }

  // Parse format like "2026-05-21 11:42:04" or raw ISO
  const ymdParts = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdParts) {
    const y = parseInt(ymdParts[1], 10);
    const m = parseInt(ymdParts[2], 10);
    const d = parseInt(ymdParts[3], 10);
    const mm = m < 10 ? `0${m}` : `${m}`;
    const dd = d < 10 ? `0${d}` : `${d}`;
    return {
      dayStr: `${y}-${mm}-${dd}`,
      monthStr: `${y}-${mm}`,
      year: y,
      monthVal: m,
      dayVal: d
    };
  }

  // Built-in parser
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = parsed.getMonth() + 1;
      const d = parsed.getDate();
      const mm = m < 10 ? `0${m}` : `${m}`;
      const dd = d < 10 ? `0${d}` : `${d}`;
      return {
        dayStr: `${y}-${mm}-${dd}`,
        monthStr: `${y}-${mm}`,
        year: y,
        monthVal: m,
        dayVal: d
      };
    }
  } catch (e) {}

  // Fallback
  const y = fallback.getFullYear();
  const m = fallback.getMonth() + 1;
  const d = fallback.getDate();
  const mm = m < 10 ? `0${m}` : `${m}`;
  const dd = d < 10 ? `0${d}` : `${d}`;
  return {
    dayStr: `${y}-${mm}-${dd}`,
    monthStr: `${y}-${mm}`,
    year: y,
    monthVal: m,
    dayVal: d
  };
}

export function SalesDashboard({ articles, movements }: SalesDashboardProps) {
  const [activeTab, setActiveTab] = useState<'CLIENTS' | 'DAILY' | 'MONTHLY'>('DAILY');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  
  // Date navigator states
  const todayParsed = parseMovementDate();
  const [selectedDay, setSelectedDay] = useState<string>(todayParsed.dayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(todayParsed.monthStr);

  // Article mapping for performant O(1) lookup
  const articleMap = useMemo(() => {
    const map = new Map<string, Article>();
    articles.forEach(art => {
      map.set(art.code.toUpperCase(), art);
    });
    return map;
  }, [articles]);

  // Pre-process all sales (DALJE movements)
  const salesData = useMemo(() => {
    return movements
      .filter((m) => m.type === 'DALJE')
      .map((m) => {
        const uppercaseCode = m.articleCode.toUpperCase();
        const art = articleMap.get(uppercaseCode);
        const salePrice = art ? art.salePrice : 0;
        const purchasePrice = art ? art.purchasePrice : 0;
        const artName = art ? art.name : `Artikull i Fshirë (${m.articleCode})`;
        const artUnit = m.unit || art?.unit || 'Copë';
        const totalValue = m.quantity * salePrice;
        const totalCost = m.quantity * purchasePrice;
        const profit = totalValue - totalCost;
        const dateParsed = parseMovementDate(m.date);
        
        return {
          ...m,
          articleName: artName,
          salePrice,
          purchasePrice,
          totalValue,
          totalCost,
          profit,
          dateParsed,
          clientClean: (m.client || '').trim() || 'Klient i Përgjithshëm'
        };
      });
  }, [movements, articleMap]);

  // Global aggregate statistics
  const stats = useMemo(() => {
    let salesToday = 0;
    let salesMonth = 0;
    let transactionsCount = salesData.length;
    let totalItemsSold = 0;
    let totalRevenue = 0;

    salesData.forEach((s) => {
      totalRevenue += s.totalValue;
      totalItemsSold += s.quantity;

      if (s.dateParsed.dayStr === todayParsed.dayStr) {
        salesToday += s.totalValue;
      }
      if (s.dateParsed.monthStr === todayParsed.monthStr) {
        salesMonth += s.totalValue;
      }
    });

    return {
      salesToday,
      salesMonth,
      transactionsCount,
      totalItemsSold,
      totalRevenue
    };
  }, [salesData, todayParsed]);

  // Clients overview calculations
  const clientsOverview = useMemo(() => {
    const clientMap: Record<string, { 
      name: string; 
      totalSpent: number; 
      transCount: number; 
      itemsCount: number;
      lastActive: string;
      items: Array<{ code: string; name: string; qty: number; value: number, date: string }>;
    }> = {};

    salesData.forEach((s) => {
      const cName = s.clientClean;
      if (!clientMap[cName]) {
        clientMap[cName] = {
          name: cName,
          totalSpent: 0,
          transCount: 0,
          itemsCount: 0,
          lastActive: s.date || '-',
          items: []
        };
      }

      clientMap[cName].totalSpent += s.totalValue;
      clientMap[cName].transCount += 1;
      clientMap[cName].itemsCount += s.quantity;
      clientMap[cName].items.push({
        code: s.articleCode,
        name: s.articleName,
        qty: s.quantity,
        value: s.totalValue,
        date: s.date || '-'
      });
    });

    return Object.values(clientMap)
      .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [salesData, clientSearch]);

  // Daily list calculations
  const dailySalesList = useMemo(() => {
    return salesData.filter(s => s.dateParsed.dayStr === selectedDay);
  }, [salesData, selectedDay]);

  const dailyTotalAmount = useMemo(() => {
    return dailySalesList.reduce((acc, curr) => acc + curr.totalValue, 0);
  }, [dailySalesList]);

  // Monthly list calculations
  const monthlySalesList = useMemo(() => {
    return salesData.filter(s => s.dateParsed.monthStr === selectedMonth);
  }, [salesData, selectedMonth]);

  const monthlyTotalAmount = useMemo(() => {
    return monthlySalesList.reduce((acc, curr) => acc + curr.totalValue, 0);
  }, [monthlySalesList]);

  // Grouped clients on selected day/month
  const dailyClientsProgress = useMemo(() => {
    const group: Record<string, number> = {};
    dailySalesList.forEach(s => {
      group[s.clientClean] = (group[s.clientClean] || 0) + s.totalValue;
    });
    return Object.entries(group).sort((a, b) => b[1] - a[1]);
  }, [dailySalesList]);

  const monthlyClientsProgress = useMemo(() => {
    const group: Record<string, number> = {};
    monthlySalesList.forEach(s => {
      group[s.clientClean] = (group[s.clientClean] || 0) + s.totalValue;
    });
    return Object.entries(group).sort((a, b) => b[1] - a[1]);
  }, [monthlySalesList]);

  // Unique days that actually have sales
  const uniqueSalesDays = useMemo(() => {
    const daySet = new Set<string>();
    salesData.forEach(s => daySet.add(s.dateParsed.dayStr));
    return Array.from(daySet).sort((a, b) => b.localeCompare(a));
  }, [salesData]);

  // Unique months that actually have sales
  const uniqueSalesMonths = useMemo(() => {
    const monthSet = new Set<string>();
    salesData.forEach(s => monthSet.add(s.dateParsed.monthStr));
    if (monthSet.size === 0) {
      monthSet.add(todayParsed.monthStr);
    }
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [salesData, todayParsed]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative overflow-hidden font-sans">
      
      {/* Elegantly Polished Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            Financat &amp; Shitjet e Shërbimit 📈
          </div>
          <h2 className="text-xl font-extrabold font-display text-slate-800 tracking-tight">
            Raporti i shitjeve ditore &amp; mujore
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Shfletoni fletëdaljet, të kemi vlerësimin neto të shitjeve dhe analizën e plotë sipas klientëve.
          </p>
        </div>

        {/* Action Tabs selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => { setActiveTab('DAILY'); setSelectedClient(null); }}
            className={`cursor-pointer px-4.5 py-2 rounded-lg text-xs font-bold transition duration-155 flex items-center gap-1.5 ${
              activeTab === 'DAILY'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Shitjet Ditore
          </button>
          
          <button
            onClick={() => { setActiveTab('MONTHLY'); setSelectedClient(null); }}
            className={`cursor-pointer px-4.5 py-2 rounded-lg text-xs font-bold transition duration-155 flex items-center gap-1.5 ${
              activeTab === 'MONTHLY'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Shitjet Mujore
          </button>

          <button
            onClick={() => { setActiveTab('CLIENTS'); setSelectedClient(null); }}
            className={`cursor-pointer px-4.5 py-2 rounded-lg text-xs font-bold transition duration-155 flex items-center gap-1.5 ${
              activeTab === 'CLIENTS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Sipas Klientëve
          </button>
        </div>
      </div>

      {/* Embedded KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 relative overflow-hidden">
          <div className="absolute top-3 right-3 p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Xhiro Sot</span>
          <span className="text-lg font-black font-display text-slate-800 block leading-tight">{formatEuro(stats.salesToday)}</span>
          <span className="text-[9px] text-slate-450 block mt-1 tracking-tight">Kalkuluar nga fletëdaljet sot</span>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 relative overflow-hidden">
          <div className="absolute top-3 right-3 p-1.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Këtë Muaj</span>
          <span className="text-lg font-black font-display text-slate-800 block leading-tight">{formatEuro(stats.salesMonth)}</span>
          <span className="text-[9px] text-slate-450 block mt-1 tracking-tight">Muaji aktual: {MONTHS_ALB[todayParsed.monthStr.split('-')[1]] || 'Aktual'}</span>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 relative overflow-hidden">
          <div className="absolute top-3 right-3 p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Artikuj të Shitur</span>
          <span className="text-lg font-black font-display text-slate-800 block leading-tight">{stats.totalItemsSold} copë</span>
          <span className="text-[9px] text-slate-450 block mt-1 tracking-tight">Vëllimi i plotë i shitjeve</span>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 relative overflow-hidden">
          <div className="absolute top-3 right-3 p-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-600">
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gjithsej Xhiro</span>
          <span className="text-lg font-black font-display text-slate-800 block leading-tight">{formatEuro(stats.totalRevenue)}</span>
          <span className="text-[9px] text-slate-450 block mt-1 tracking-tight">Nga {stats.transactionsCount} transaksione me fletëdalje</span>
        </div>
      </div>

      {/* Active screen content display */}

      {/* Tab 1: DAILY SALES BROWSER */}
      {activeTab === 'DAILY' && (
        <div className="space-y-6">
          <div className="bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-150">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-450 shrink-0" />
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Përzgjidhni Ditën</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="bg-transparent font-bold text-sm text-slate-800 focus:outline-none cursor-pointer pr-4"
                >
                  {uniqueSalesDays.length === 0 ? (
                    <option value={todayParsed.dayStr}>Sot ({todayParsed.dayStr})</option>
                  ) : (
                    uniqueSalesDays.map(day => (
                      <option key={day} value={day}>
                        {day === todayParsed.dayStr ? 'Sot' : ''} {day.split('-').reverse().join('/')}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Xhiro ditore</span>
              <span className="text-base font-black text-rose-600">{formatEuro(dailyTotalAmount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar client progress */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col">
              <h3 className="text-xs font-bold text-slate-755 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Klientët më Aktivë të Ditës</span>
                <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-mono">{dailyClientsProgress.length}</span>
              </h3>

              {dailyClientsProgress.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-slate-400 text-xs">
                  <span>Nuk ka shitje në këtë ditë</span>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-1">
                  {dailyClientsProgress.map(([client, sum]) => (
                    <div key={client} className="bg-white p-3 rounded-xl border border-slate-155 flex flex-col gap-1.5 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-750 truncate max-w-[150px]">{client}</span>
                        <span className="text-xs font-black text-slate-900 font-mono">{formatEuro(sum)}</span>
                      </div>
                      {/* Custom indicator scale */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full" 
                          style={{ width: `${dailyTotalAmount > 0 ? (sum / dailyTotalAmount) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily transactions logs */}
            <div className="lg:col-span-8">
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-extrabold uppercase text-slate-655 tracking-wider">Detajet e fletëdaljeve</span>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold font-mono">{dailySalesList.length} transaksione</span>
                </div>

                {dailySalesList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                    <ShoppingBag className="w-8 h-8 text-slate-350" />
                    <span>Nuk ka asnjë fletëdalje të regjistruar për këtë datë.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[350px]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/70 text-slate-400 border-b border-slate-150 sticky top-0">
                        <tr className="uppercase text-[9px] tracking-wider font-bold">
                          <th className="p-3">Artikulli / Kodi</th>
                          <th className="p-3">Sasia</th>
                          <th className="p-3">Klienti / Riparimi</th>
                          <th className="p-3 text-right">Totali (Euro)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {dailySalesList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition duration-155">
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{item.articleName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{item.articleCode}</div>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-705">
                              {item.quantity} {item.unit || 'Cope'}
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-slate-800 text-[11px]">{item.clientClean}</div>
                              {item.repairNo && (
                                <div className="text-[10px] text-slate-410 italic truncate max-w-[160px]" title={item.repairNo}>
                                  Përfshirë: {item.repairNo}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-rose-600 text-[13px]">
                              {formatEuro(item.totalValue)}
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
      )}

      {/* Tab 2: MONTHLY SALES BROWSER */}
      {activeTab === 'MONTHLY' && (
        <div className="space-y-6">
          <div className="bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-155">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-450 shrink-0" />
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Përzgjidhni Muajin</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent font-bold text-sm text-slate-800 focus:outline-none cursor-pointer pr-4"
                >
                  {uniqueSalesMonths.map(mStr => {
                    const [y, m] = mStr.split('-');
                    const displayMonthName = MONTHS_ALB[m] || m;
                    return (
                      <option key={mStr} value={mStr}>
                        {mStr === todayParsed.monthStr ? 'Muaji Aktual ' : ''}({displayMonthName} {y})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Xhiro Mujore</span>
              <span className="text-base font-black text-rose-600">{formatEuro(monthlyTotalAmount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar client monthly stats */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col">
              <h3 className="text-xs font-bold text-slate-755 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Renditja e Klientëve për Muajin</span>
                <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-mono">{monthlyClientsProgress.length}</span>
              </h3>

              {monthlyClientsProgress.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-slate-400 text-xs">
                  <span>Nuk ka shitje këtë muaj</span>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-1">
                  {monthlyClientsProgress.map(([client, sum]) => (
                    <div key={client} className="bg-white p-3 rounded-xl border border-slate-155 flex flex-col gap-1.5 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-755 truncate max-w-[150px]">{client}</span>
                        <span className="text-xs font-black text-slate-900 font-mono">{formatEuro(sum)}</span>
                      </div>
                      {/* Custom indicator scale */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full" 
                          style={{ width: `${monthlyTotalAmount > 0 ? (sum / monthlyTotalAmount) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly transactions lists */}
            <div className="lg:col-span-8">
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-extrabold uppercase text-slate-655 tracking-wider">Detajet e transaksioneve të Muajit</span>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold font-mono">{monthlySalesList.length} transaksione</span>
                </div>

                {monthlySalesList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                    <ShoppingBag className="w-8 h-8 text-slate-350" />
                    <span>Nuk ka asnjë fletëdalje të rregjistruar këtë muaj.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[350px]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/70 text-slate-400 border-b border-slate-150 sticky top-0">
                        <tr className="uppercase text-[9px] tracking-wider font-bold">
                          <th className="p-3">Data</th>
                          <th className="p-3">Artikulli</th>
                          <th className="p-3">Klienti / Riparimi</th>
                          <th className="p-3 text-right">Totali (Euro)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {monthlySalesList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition duration-155">
                            <td className="p-3 text-slate-400 font-mono text-[10px] tracking-tighter shrink-0">
                              {item.date ? item.date.split(',')[0] : '-'}
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{item.articleName}</div>
                              <div className="text-[9px] text-slate-400 font-mono">{item.articleCode} (x{item.quantity})</div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800 text-[10px]">{item.clientClean}</div>
                              {item.repairNo && (
                                <div className="text-[9px] text-slate-400 italic truncate max-w-[130px]" title={item.repairNo}>
                                  {item.repairNo}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-rose-600 text-[12px]">
                              {formatEuro(item.totalValue)}
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
      )}

      {/* Tab 3: PERSPECTIVE BY CLIENT */}
      {activeTab === 'CLIENTS' && (
        <div className="space-y-6">
          <div className="sm:flex sm:items-center sm:justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Kërko sipas emrit të klientit..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setSelectedClient(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition duration-150"
              />
            </div>
            
            {selectedClient && (
              <button
                onClick={() => setSelectedClient(null)}
                className="mt-2 sm:mt-0 text-[11px] font-bold text-rose-600 hover:text-rose-750 flex items-center gap-1 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Kthehu tek lista e klientëve
              </button>
            )}
          </div>

          {/* Conditional Layout representation: List of clients vs Active Selected customer report */}
          {!selectedClient ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                    <tr className="uppercase text-[9px] tracking-wider font-bold">
                      <th className="p-4">Klienti</th>
                      <th className="p-4 text-center">Fletëdalje regjistruar</th>
                      <th className="p-4 text-center">Pjesë të blera</th>
                      <th className="p-4 text-right">Vlera e Faturuar (Neto)</th>
                      <th className="p-4 text-right">Analiza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientsOverview.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          Nuk u gjet asnjë klient me emrin e kërkuar.
                        </td>
                      </tr>
                    ) : (
                      clientsOverview.map((client) => (
                        <tr key={client.name} className="hover:bg-slate-50/50 transition duration-155">
                          <td className="p-4">
                            <div className="font-extrabold text-slate-800 text-[13px]">{client.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Aktiviteti i fundit: {client.lastActive}</div>
                          </td>
                          <td className="p-4 text-center font-mono font-medium text-slate-600">
                            {client.transCount}
                          </td>
                          <td className="p-4 text-center font-mono font-medium text-slate-600">
                            {client.itemsCount} copë
                          </td>
                          <td className="p-4 text-right font-mono font-black text-rose-600 text-[13px]">
                            {formatEuro(client.totalSpent)}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedClient(client.name)}
                              className="cursor-pointer inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 px-3 py-1.5 rounded-lg transition duration-200"
                            >
                              Detajet <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Customer Detailed Ledger Card
            (() => {
              const currentClientData = clientsOverview.find(c => c.name === selectedClient);
              if (!currentClientData) return null;

              return (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">Raporti i shitjeve të Shërbimit</div>
                      <h4 className="text-base font-extrabold text-slate-800">{currentClientData.name}</h4>
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-right">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Total Kontributi</span>
                      <span className="text-base font-black text-rose-600 font-mono">{formatEuro(currentClientData.totalSpent)}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 bg-white rounded-xl overflow-hidden mt-3 max-h-[250px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-450 border-b border-slate-200">
                        <tr className="uppercase text-[9px] font-bold">
                          <th className="p-3">Data</th>
                          <th className="p-3">Artikulli</th>
                          <th className="p-3 text-center">Sasia</th>
                          <th className="p-3 text-right">Vlera (Euro)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentClientData.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-400 font-mono text-[10px]">{it.date.split(',')[0]}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800">{it.name}</span>
                              <span className="text-[9px] text-slate-415 block font-mono">{it.code}</span>
                            </td>
                            <td className="p-3 text-center font-mono text-slate-600">{it.qty}</td>
                            <td className="p-3 text-right font-mono font-bold text-rose-600">{formatEuro(it.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

    </div>
  );
}
