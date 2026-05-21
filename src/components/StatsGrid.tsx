/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Package, ArrowDownUp, Euro, AlertCircle, ShoppingCart } from 'lucide-react';
import { Article, Movement } from '../types';

interface StatsGridProps {
  mergedStockCount: number;
  movementsCount: number;
  totalStockValue: number;
  lowStockItemsCount: number;
  pendingOrdersCount: number;
}

export function StatsGrid({
  mergedStockCount,
  movementsCount,
  totalStockValue,
  lowStockItemsCount,
  pendingOrdersCount,
}: StatsGridProps) {
  const cards = [
    {
      title: 'Artikuj Gjithsej',
      value: mergedStockCount,
      sub: 'Përfshirë katalogun bazë',
      icon: Package,
      color: 'bg-white border-slate-200 text-slate-900',
      iconColor: 'text-amber-500 bg-amber-50/80',
    },
    {
      title: 'Lëvizje Stoku',
      value: movementsCount,
      sub: 'Hyrje/dalje të kryera',
      icon: ArrowDownUp,
      color: 'bg-white border-slate-200 text-slate-900',
      iconColor: 'text-slate-700 bg-slate-100',
    },
    {
      title: 'Vlera e Stokut',
      value: `€ ${totalStockValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'Vlera aktuale e magazinës',
      icon: Euro,
      color: 'bg-slate-900 border-slate-950 text-white shadow-lg shadow-slate-900/10',
      iconColor: 'text-amber-400 bg-slate-800 border border-slate-700/60',
    },
    {
      title: 'Stok i Ulët',
      value: lowStockItemsCount,
      sub: 'Kërkojnë furnizim të shpejtë',
      icon: AlertCircle,
      color: lowStockItemsCount > 0 ? 'bg-rose-50/30 border-rose-200 text-rose-800' : 'bg-white border-slate-200 text-slate-900',
      iconColor: lowStockItemsCount > 0 ? 'text-rose-600 bg-rose-100/70 animate-pulse' : 'text-slate-400 bg-slate-100',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isDark = card.color.includes('bg-slate-900');
        return (
          <motion.div
            key={idx}
            variants={itemVariants}
            className={`rounded-2xl p-5 border ${card.color} flex items-center justify-between shadow-xs transition-all duration-300 hover:scale-[1.01] hover:shadow-md`}
          >
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {card.title}
              </p>
              <h3 className={`text-2xl font-black mt-1.5 tracking-tight font-sans`}>
                {card.value}
              </h3>
              <div className="mt-2.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                  isDark
                    ? 'bg-slate-800 text-amber-450 text-amber-400 border border-slate-700/60'
                    : card.title === 'Stok i Ulët' && lowStockItemsCount > 0 
                    ? 'bg-rose-100 text-rose-800 font-bold'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {card.sub}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-xl ${card.iconColor}`}>
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
