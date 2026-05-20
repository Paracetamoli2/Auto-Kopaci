/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowDownUp, Plus, Send, AlertTriangle, Trash2, HelpCircle } from 'lucide-react';
import { Article, Movement } from '../types';

interface MovementFormProps {
  mergedStock: Array<{
    name: string;
    category: string;
    code?: string;
    quantity?: number;
    unit?: string;
    purchasePrice?: number;
  }>;
  articles: Article[];
  pendingMovements: Movement[];
  setPendingMovements: React.Dispatch<React.SetStateAction<Movement[]>>;
  onRegisterMovements: () => void;
}

export function MovementForm({
  mergedStock,
  articles,
  pendingMovements,
  setPendingMovements,
  onRegisterMovements,
}: MovementFormProps) {
  const [selectedArticleName, setSelectedArticleName] = useState('');
  const [type, setType] = useState<'DALJE' | 'HYRJE'>('DALJE');
  const [quantity, setQuantity] = useState('');
  const [client, setClient] = useState('');
  const [repairNo, setRepairNo] = useState('');

  // Find info about selected article for smart helpers
  const selectedDetails = articles.find(
    (a) => a.name.toLowerCase() === selectedArticleName.toLowerCase()
  );

  const handleAddToPending = () => {
    if (!selectedArticleName) return;
    if (!quantity || Number(quantity) <= 0) return;

    // Check if the item actually exists in articles
    if (!selectedDetails) {
      alert(`Ky artikull (${selectedArticleName}) duhet të shtohet fillimisht në stok si artikull aktiv përpara se të kryeni lëvizje.`);
      return;
    }

    const qty = Number(quantity);

    // If Outward, verify if we have sufficient quantity
    if (type === 'DALJE' && selectedDetails.quantity < qty) {
      alert(`Stok i pamjaftueshëm! ${selectedDetails.name} ka vetëm ${selectedDetails.quantity} ${selectedDetails.unit} gjendje.`);
      return;
    }

    // Check if copy already in pending lists to merge or warn
    const newItem: Movement = {
      articleCode: selectedDetails.code, // use actual code
      type,
      quantity: qty,
      client: client.trim() ? `${client.trim()}${repairNo.trim() ? ` / Nr.Riparimi: ${repairNo.trim()}` : ''}` : (repairNo.trim() ? `Nr.Riparimi: ${repairNo.trim()}` : ''),
      unit: selectedDetails.unit,
    };

    setPendingMovements([...pendingMovements, newItem]);

    // Fast resets of inputs except Client details which might be reused for another item in the same repair ticket
    setSelectedArticleName('');
    setQuantity('');
  };

  const handleRemovePending = (idx: number) => {
    setPendingMovements(pendingMovements.filter((_, i) => i !== idx));
  };

  const handleFinalize = () => {
    if (pendingMovements.length === 0) return;
    onRegisterMovements();
    // Reset inputs
    setClient('');
    setRepairNo('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 sm:p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <ArrowDownUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-800">
              Regjistro Hyrje/Dalje (Transaksione)
            </h2>
            <p className="text-xs text-slate-500">Menaxho mbërritjen e mallrave ose shitjet e klientëve</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Zgjidh Artikullin nga Stoku *
            </label>
            <select
              value={selectedArticleName}
              onChange={(e) => setSelectedArticleName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
            >
              <option value="">-- Zgjidh artikullin për lëvizje --</option>
              {mergedStock.map((a, i) => (
                <option key={i} value={a.name}>
                  {a.name} {a.code ? `[Sasi: ${a.quantity || 0} ${a.unit || 'Cope'}]` : '(Nuk është shtuar ende në stok)'}
                </option>
              ))}
            </select>
          </div>

          {/* Smart alert if selected template item is not initialized in active stock */}
          {selectedArticleName && !selectedDetails && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-800 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Artikulli nuk është shtuar ende në Stok! </span>
                Ky produkt ekziston si model në katalog por s'ka asnjë regjistrim sasie ose kodi.
                Ju lutem shtojeni fillimisht tek paneli <span className="font-bold text-slate-900">"Shto Artikull"</span> duke plotësuar sasinë fillestare ose çmimin.
              </div>
            </div>
          )}

          {selectedDetails && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gjendja aktuale:</span>{' '}
                <span className="font-mono font-bold text-slate-800 ml-1">
                  {selectedDetails.quantity} {selectedDetails.unit}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kategoria:</span>{' '}
                <span className="text-blue-600 font-bold ml-1">
                  {selectedDetails.category}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Lloji i Lëvizjes
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'DALJE' | 'HYRJE')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
              >
                <option value="DALJE">DALJE (Shitje / Riparim)</option>
                <option value="HYRJE">HYRJE (Furnizim / Manual)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Sasia për Zhvendosje
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Emri i Klientit
              </label>
              <input
                type="text"
                placeholder="p.sh. Albert Kopaçi"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nr. Riparimi (Opsionale)
              </label>
              <input
                type="text"
                placeholder="p.sh. AA-342"
                value={repairNo}
                onChange={(e) => setRepairNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition duration-200"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleAddToPending}
              disabled={!selectedArticleName || !quantity}
              className="flex-1 cursor-pointer bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed text-slate-700 font-bold py-3 rounded-xl text-sm transition duration-200 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Shto në Listë
            </button>

            <button
              type="button"
              onClick={handleFinalize}
              disabled={pendingMovements.length === 0}
              className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-blue-100"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              Regjistro Lëvizjet
            </button>
          </div>
        </div>
      </div>

      {pendingMovements.length > 0 && (
        <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-2.5">
            Artikuj në pritje për regjistrim ({pendingMovements.length})
          </p>
          <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
            {pendingMovements.map((pm, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-xs py-2 px-3 bg-white border border-slate-200 rounded-lg group animate-fade-in"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        pm.type === 'HYRJE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {pm.type}
                    </span>
                    <span>{pm.articleCode}</span>
                  </div>
                  {pm.client && (
                    <span className="text-[10px] text-slate-400">
                      Marrësi: {pm.client}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-600">
                    x{pm.quantity} {pm.unit}
                  </span>
                  <button
                    onClick={() => handleRemovePending(idx)}
                    className="cursor-pointer text-slate-400 hover:text-rose-600 p-1 rounded-md transition duration-200"
                    title="Hiqe artikullin"
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
  );
}
