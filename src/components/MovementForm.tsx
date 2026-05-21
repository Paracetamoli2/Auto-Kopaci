/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowDownUp, 
  Plus, 
  Send, 
  AlertTriangle, 
  Trash2, 
  HelpCircle, 
  Share2, 
  Printer, 
  X, 
  Eye, 
  MessageSquare,
  FileText,
  Search,
  Check
} from 'lucide-react';
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
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [type, setType] = useState<'DALJE' | 'HYRJE'>('DALJE');
  const [quantity, setQuantity] = useState('');
  const [client, setClient] = useState('');
  const [repairNo, setRepairNo] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Helper to lookup correct article name from code
  const getArticleNameByCode = (code: string) => {
    const art = articles.find((a) => a.code === code);
    return art ? art.name : code;
  };

  const pendingDaljeMovements = pendingMovements.filter((m) => m.type === 'DALJE');

  const handleWhatsAppShare = () => {
    const dateStr = new Date().toLocaleDateString('sq-AL');
    const currentClientName = client.trim() || 'Klient i Përgjithshëm';
    const currentRepairNo = repairNo.trim() ? ` / Koment: ${repairNo.trim()}` : '';

    let text = `*📋 AUTOSERVIS - FLETË POROSIE*\n\n`;
    text += `*👤 Klienti:* ${currentClientName}${currentRepairNo}\n`;
    text += `*📅 Data:* ${dateStr}\n`;
    text += `------------------------------------------\n`;
    text += `*Artikujt ose Pjesët (Vetëm Sasitë):*\n`;

    pendingDaljeMovements.forEach((pm, i) => {
      const artName = getArticleNameByCode(pm.articleCode);
      text += `• *${pm.quantity}x* - ${artName}\n`;
    });

    text += `------------------------------------------\n`;
    text += `*_Gjeneruar nga Programi i Inventarit të Servisit_*`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

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
      client: client.trim(),
      repairNo: repairNo.trim(),
      unit: selectedDetails.unit,
    };

    setPendingMovements([...pendingMovements, newItem]);

    // Fast resets of inputs except Client details which might be reused for another item in the same repair ticket
    setSelectedArticleName('');
    setArticleSearchQuery('');
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
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 sm:p-2.5 bg-slate-900 border border-slate-950 rounded-xl text-amber-500">
            <ArrowDownUp className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
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
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Shkruaj emrin e artikullit nga stoku..."
                value={articleSearchQuery}
                onFocus={() => setIsSearchDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsSearchDropdownOpen(false), 200)}
                onChange={(e) => {
                  setArticleSearchQuery(e.target.value);
                  setSelectedArticleName(''); // clear selected until chosen
                  setIsSearchDropdownOpen(true);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition duration-200"
              />
              <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </div>

              {isSearchDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {mergedStock
                    .filter((a) => a.name.toLowerCase().includes(articleSearchQuery.toLowerCase()))
                    .slice(0, 30) // limit for performance
                    .map((a, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedArticleName(a.name);
                          setArticleSearchQuery(a.name);
                          setIsSearchDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 text-slate-800 transition flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-900">{a.name}</span>
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold font-sans">
                          {a.code ? `Sasi: ${a.quantity || 0} ${a.unit || 'Cope'}` : '(Jo në stok)'}
                        </span>
                      </button>
                    ))}
                  {mergedStock.filter((a) => a.name.toLowerCase().includes(articleSearchQuery.toLowerCase())).length === 0 && (
                    <div className="p-3 text-xs text-slate-400 text-center">Nuk u gjet asnjë artikull me këtë emër.</div>
                  )}
                </div>
              )}
            </div>
            {selectedArticleName && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                <Check className="w-3 h-3 text-emerald-600 font-bold" />
                Artikulli u përzgjodh me sukses!
              </div>
            )}
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
                <span className="text-slate-700 font-bold ml-1 bg-slate-200/60 px-2 py-0.5 rounded">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition duration-200"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition duration-200"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Koment mbi Riparimin (Opsionale)
              </label>
              <input
                type="text"
                placeholder="p.sh. Ndërrimi i vajit dhe filtrave..."
                value={repairNo}
                onChange={(e) => setRepairNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition duration-200"
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
          {pendingDaljeMovements.length > 0 && (
            <div className="mb-3.5 pb-3 border-b border-slate-200/60 flex items-center justify-between gap-2 text-wrap">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Share2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-bold">Porosia e Klientit (Pa Çmime):</span>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 hover:border-emerald-300 text-emerald-800 text-[10px] sm:text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition duration-150 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Gjenero PDF & WhatsApp
              </button>
            </div>
          )}

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
                    <span>{getArticleNameByCode(pm.articleCode)}</span>
                  </div>
                  {(pm.client || pm.repairNo) && (
                    <span className="text-[10px] text-slate-400">
                      {pm.client ? `Marrësi: ${pm.client}` : ''}
                      {pm.client && pm.repairNo ? ' | ' : ''}
                      {pm.repairNo ? `Koment: ${pm.repairNo}` : ''}
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

      {/* Modern, Highly Polished WhatsApp and Print PDF Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          {/* Dynamic Stylesheet Injector for high fidelity print mapping */}
          <style>{`
            @media print {
              /* Hide absolutely everything else */
              body * {
                visibility: hidden !important;
                background: transparent !important;
              }
              /* Show the designated printable area ONLY and fit layout fully on standard A4 / A5 sheet */
              #printable-area, #printable-area * {
                visibility: visible !important;
              }
              #printable-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                color: black !important;
                padding: 40px !important;
                box-shadow: none !important;
                border: none !important;
              }
              /* Specific styles to make the ticket look clean and crisp */
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Modal Header (No Print) */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between no-print bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2 text-slate-800">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold">Porosia e Klientit (Fletë-Dalje)</h3>
                  <p className="text-[11px] text-slate-500">Mbyllja e lëvizjes dhe ndarja si tekst ose PDF pa çmime</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 cursor-pointer text-slate-400 hover:text-slate-650 hover:bg-slate-200/50 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Receipt Preview */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-100/50">
              <div 
                id="printable-area" 
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm mx-auto max-w-sm sm:max-w-md font-sans text-xs text-slate-800"
              >
                {/* Header Section */}
                <div className="text-center pb-4 border-b border-dashed border-slate-200">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-950 font-display">
                    AUTO SERVIS KOPAÇI
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Magazina Qendrore & Pjesë Këmbimi
                  </p>
                  <span className="inline-block mt-2 px-3 py-0.5 bg-slate-50 text-[9px] font-bold text-slate-500 border border-slate-200 rounded-full font-mono uppercase tracking-wider">
                    Fletë-Tërheqje / Porosi
                  </span>
                </div>

                {/* Info Fields */}
                <div className="py-4 space-y-2 text-[11px] border-b border-dashed border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Klienti:</span>
                    <span className="font-bold text-slate-900">{client.trim() || 'Klient i Përgjithshëm'}</span>
                  </div>
                  {repairNo.trim() && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-slate-400 font-bold uppercase text-[9px] shrink-0">Koment / Shënime:</span>
                      <span className="font-sans font-bold text-slate-800 text-right">{repairNo}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Data e Hartimit:</span>
                    <span className="font-mono text-slate-600">{new Date().toLocaleDateString('sq-AL')}</span>
                  </div>
                </div>

                {/* Items Table List */}
                <div className="py-4 font-mono">
                  <p className="font-bold text-[9px] text-slate-400 uppercase tracking-widest mb-3 font-sans">
                    Artikujt ose Pjesët (Masa & Sasia):
                  </p>
                  <div className="space-y-2.5">
                    {pendingDaljeMovements.map((pm, i) => (
                      <div key={i} className="flex justify-between items-start text-xs leading-normal">
                        <span className="text-slate-500 mr-2 font-sans">{i + 1}.</span>
                        <span className="font-bold text-slate-950 flex-1 font-sans text-left tracking-tight">
                          {getArticleNameByCode(pm.articleCode)}
                        </span>
                        <span className="text-right text-slate-800 font-bold ml-4">
                          {pm.quantity} {pm.unit || 'Cope'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Professional Sign-offs and Disclaimer */}
                <div className="pt-6 mt-4 border-t border-dashed border-slate-200 grid grid-cols-2 gap-4 text-center text-[10px]">
                  <div>
                    <p className="text-slate-400 text-[9px] uppercase font-bold">Dorëzoi (Servisi)</p>
                    <div className="h-10 border-b border-slate-200 mt-2"></div>
                    <p className="text-slate-500 font-medium mt-1 font-mono text-[9px]">Auto Servis</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[9px] uppercase font-bold">Mori (Klienti)</p>
                    <div className="h-10 border-b border-slate-200 mt-2"></div>
                    <p className="text-slate-500 font-medium mt-1 font-mono text-[9px] truncate">
                      {client.trim() || 'Klient / Shoferi'}
                    </p>
                  </div>
                </div>

                {/* Small disclaimer footer */}
                <div className="text-center text-[9px] text-slate-400 mt-6 pt-3 border-t border-slate-100 font-medium">
                  * Ky dokument shërben për kontrollin dhe lëshimin e stokut nga magazina. Nuk përmban detaje financiare (pa çmime).
                </div>
              </div>
            </div>

            {/* Modal Actions Footer (No Print) */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row gap-3 text-xs font-bold no-print">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-emerald-100"
              >
                <MessageSquare className="w-4 h-4 text-emerald-100 stroke-[2.5]" />
                Dërgo në WhatsApp
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-blue-100"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                Printo / Ruaj si PDF
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="cursor-pointer bg-white border border-slate-250 hover:bg-slate-50 text-slate-650 py-2.5 px-4 rounded-xl transition"
              >
                Mbyll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
