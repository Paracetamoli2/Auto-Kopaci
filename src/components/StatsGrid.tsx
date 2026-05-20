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
      color: 'border-slate-200 text-slate-900',
      iconColor: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Lëvizje Stoku',
      value: movementsCount,
      sub: 'Hyrje dhe dalje të regjistruara',
      icon: ArrowDownUp,
      color: 'border-slate-200 text-slate-900',
      iconColor: 'text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Vlera e Stokut',
      value: `€ ${totalStockValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'Bazuar në çmimin e blerjes',
      icon: Euro,
      color: 'border-slate-200 border-l-4 border-l-blue-600 text-slate-900',
      iconColor: 'text-emerald-600 bg-emerald-50',
    },
    {
      title: 'Stok i Ulët',
      value: lowStockItemsCount,
      sub: 'Artikuj me 3 ose më pak njësi',
      icon: AlertCircle,
      color: lowStockItemsCount > 0 ? 'border-amber-200 text-amber-700 bg-amber-50/20' : 'border-slate-200 text-slate-900',
      iconColor: lowStockItemsCount > 0 ? 'text-amber-600 bg-amber-50 animate-pulse' : 'text-slate-400 bg-slate-100',
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
        return (
          <motion.div
            key={idx}
            variants={itemVariants}
            className={`bg-white rounded-2xl p-5 border ${card.color} flex items-center justify-between shadow-xs transition-all duration-300 hover:scale-[1.01] hover:shadow-md`}
          >
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                {card.title}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight font-display">
                {card.value}
              </h3>
              <div className="mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                  card.title === 'Stok i Ulët' && lowStockItemsCount > 0 
                    ? 'bg-amber-100/80 text-amber-800'
                    : card.title === 'Vlera e Stokut'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {card.sub}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-xl ${card.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
