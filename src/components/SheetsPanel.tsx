/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  LogIn, 
  LogOut, 
  CloudUpload, 
  CloudDownload, 
  Settings, 
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  createSpreadsheet, 
  updateSpreadsheetValues, 
  getSpreadsheetValues,
  getSpreadsheetMetadata
} from '../lib/sheetsService';
import { Article } from '../types';

interface SheetsPanelProps {
  mergedStock: any[];
  onImportArticles: (articles: Article[]) => void;
  showFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export function SheetsPanel({ mergedStock, onImportArticles, showFeedback }: SheetsPanelProps) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(() => {
    return localStorage.getItem('google_spreadsheet_id') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastSync, setLastSync] = useState(() => {
    return localStorage.getItem('google_sheets_last_sync') || '';
  });

  // Keep track of auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, activeToken) => {
        setUser(currentUser);
        setToken(activeToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Persist spreadsheetId
  const handleSpreadsheetIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    let extractedId = val;
    // Extract ID if full Google Sheets URL is pasted
    if (val.includes('docs.google.com/spreadsheets')) {
      const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        extractedId = match[1];
      }
    }
    setSpreadsheetId(extractedId);
    localStorage.setItem('google_spreadsheet_id', extractedId);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage('');
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        showFeedback('U identifikuat me sukses me llogarinë Google!', 'success');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      showFeedback('Dështoi identifikimi me Google.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      showFeedback('U çkyçët nga llogaria Google.', 'success');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Helper: Format stock data into spreadsheet lines
  const getStockValuesPayload = () => {
    const headers = ["Kodi SKU", "Emri i Artikullit", "Sasia", "Njesia", "Cmimi i Blerjes (EUR)", "Cmimi i Shitjes (EUR)", "Kategoria"];
    const rows = mergedStock
      .filter(item => item.code) // Export only active registered items
      .map(item => [
        item.code,
        item.name,
        parseFloat(item.quantity || 0),
        item.unit || 'Cope',
        parseFloat(item.purchasePrice || 0),
        parseFloat(item.salePrice || 0),
        item.category || ''
      ]);
    return [headers, ...rows];
  };

  // 1. Export: Quick Create and Export
  const handleCreateAndExport = async () => {
    if (!token) return;
    setIsLoading(true);
    setStatusMessage('Duke krijuar Google Sheet të ri...');
    try {
      const title = `Magazina Auto Servis - ${new Date().toISOString().split('T')[0]}`;
      const newId = await createSpreadsheet(token, title);
      
      setSpreadsheetId(newId);
      localStorage.setItem('google_spreadsheet_id', newId);
      
      setStatusMessage('Fleta u krijua. Duke eksportuar të dhënat e stokut...');
      const values = getStockValuesPayload();
      await updateSpreadsheetValues(token, newId, 'Sheet1!A1', values);

      const timestamp = new Date().toLocaleString('sq-AL');
      setLastSync(timestamp);
      localStorage.setItem('google_sheets_last_sync', timestamp);
      setStatusMessage('');
      showFeedback('Sukses! Artikujt u eksportuan në një fletë të re Google.', 'success');
    } catch (err: any) {
      console.error(err);
      setStatusMessage('');
      showFeedback(err.message || 'Gabim gjatë eksportimit në fletë të re.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Export: Update Existing sheet
  const handleExportToExisting = async () => {
    if (!token) return;
    if (!spreadsheetId.trim()) {
      showFeedback('Ju lutemi shtoni një ID ose URL të vlefshme për fletën ekzistuese.', 'error');
      return;
    }
    const confirmed = window.confirm(
      'Kujdes: Kjo do të fshijë ose mbishkruajë vlerat ekzistuese në diapazonin "Sheet1" të fletës suaj të punës me të dhënat aktuale të sistemit. A doni të vazhdoni?'
    );
    if (!confirmed) return;

    setIsLoading(true);
    setStatusMessage('Duke lexuar fletën ekzistuese...');
    try {
      // Validate metadata
      const meta = await getSpreadsheetMetadata(token, spreadsheetId);
      const sheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';
      
      setStatusMessage(`Duke eksportuar të dhënat në tabin "${sheetName}"...`);
      const values = getStockValuesPayload();
      await updateSpreadsheetValues(token, spreadsheetId, `${sheetName}!A1`, values);

      const timestamp = new Date().toLocaleString('sq-AL');
      setLastSync(timestamp);
      localStorage.setItem('google_sheets_last_sync', timestamp);
      setStatusMessage('');
      showFeedback('Sukses! Fleta e punës u përditësua me të dhënat më të reja.', 'success');
    } catch (err: any) {
      console.error(err);
      setStatusMessage('');
      showFeedback(err.message || 'Gabim gjatë përditësimit të fletës ekzistuese.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Import: Pull from Google sheets
  const handleImportFromSheets = async () => {
    if (!token) return;
    if (!spreadsheetId.trim()) {
      showFeedback('Ju lutemi shtoni një ID ose URL të vlefshme për fletën që dëshironi të importoni.', 'error');
      return;
    }

    const confirmed = window.confirm(
      'Kujdes: Ky importim do të marrë të dhënat e stokut nga Google Sheets dhe do t\'i zëvendësojë ose shtojë në magazinën tuaj lokale. A dëshironi të vazhdoni?'
    );
    if (!confirmed) return;

    setIsLoading(true);
    setStatusMessage('Duke tërhequr informacionin nga Google Sheets...');
    try {
      const meta = await getSpreadsheetMetadata(token, spreadsheetId);
      const sheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';

      setStatusMessage(`Duke lexuar tabin "${sheetName}"...`);
      // Pull and parse
      const rows = await getSpreadsheetValues(token, spreadsheetId, `${sheetName}!A1:Z1000`);
      if (!rows || rows.length < 2) {
        throw new Error('Nuk u gjetën të dhëna të vlefshme në fletë ose fleta është bosh.');
      }

      const headers = rows[0].map((h: any) => String(h).toLowerCase().trim());
      
      // Attempt smart index mapping
      let skuIdx = headers.findIndex(h => h.includes('sku') || h.includes('kod'));
      let nameIdx = headers.findIndex(h => h.includes('emër') || h.includes('emer') || h.includes('artikull') || h.includes('name'));
      let qtyIdx = headers.findIndex(h => h.includes('sasi') || h.includes('qty') || h.includes('quant') || h.includes('gjendje') || h.includes('stok'));
      let unitIdx = headers.findIndex(h => h.includes('njesi') || h.includes('njësi') || h.includes('unit'));
      let buyIdx = headers.findIndex(h => h.includes('blerje') || h.includes('purchase') || h.includes('buy'));
      let saleIdx = headers.findIndex(h => h.includes('shitje') || h.includes('sale') || h.includes('price'));
      let catIdx = headers.findIndex(h => h.includes('kategori') || h.includes('cat') || h.includes('grup'));

      // Clean default matching fallback if indexes missing
      if (skuIdx === -1) skuIdx = 0;
      if (nameIdx === -1) nameIdx = 1;
      if (qtyIdx === -1) qtyIdx = 2;
      if (unitIdx === -1) unitIdx = 3;
      if (buyIdx === -1) buyIdx = 4;
      if (saleIdx === -1) saleIdx = 5;
      if (catIdx === -1) catIdx = 6;

      const importedArticles: Article[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const rawCode = row[skuIdx] ? String(row[skuIdx]).trim() : '';
        const rawName = row[nameIdx] ? String(row[nameIdx]).trim() : '';
        if (!rawName) continue; // Skip rows without name
        
        const code = rawCode || rawName.toUpperCase().replace(/\s+/g, '-');
        const quantity = row[qtyIdx] ? Math.max(0, parseInt(row[qtyIdx])) : 0;
        const unit = row[unitIdx] ? String(row[unitIdx]).trim() : 'Cope';
        const purchasePrice = row[buyIdx] ? Math.max(0, parseFloat(row[buyIdx])) : 0;
        const salePrice = row[saleIdx] ? Math.max(0, parseFloat(row[saleIdx])) : 0;
        const category = row[catIdx] ? String(row[catIdx]).trim() : 'I Importuar';

        importedArticles.push({
          code,
          name: rawName,
          category,
          quantity: isNaN(quantity) ? 0 : quantity,
          purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
          salePrice: isNaN(salePrice) ? 0 : salePrice,
          unit: unit || 'Cope',
          createdAt: new Date().toLocaleString('sq-AL')
        });
      }

      if (importedArticles.length === 0) {
        throw new Error('Nuk u arrit të importohej asnjë artikull i vlefshëm nga skedari.');
      }

      onImportArticles(importedArticles);
      
      const timestamp = new Date().toLocaleString('sq-AL');
      setLastSync(timestamp);
      localStorage.setItem('google_sheets_last_sync', timestamp);
      setStatusMessage('');
      showFeedback(`Importimi i ${importedArticles.length} artikujve u krye me sukses!`, 'success');
    } catch (err: any) {
      console.error(err);
      setStatusMessage('');
      showFeedback(err.message || 'Gabim gjatë importimit të të dhënave.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Sinkronizimi me Google Sheets</h3>
            <p className="text-[11px] text-slate-500">Mundëson import/eksport në kohë reale të magazinës</p>
          </div>
        </div>

        {user && (
          <button
            onClick={handleLogout}
            title="Doblidhohu nga llogaria"
            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-600 transition duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {needsAuth ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-slate-600 max-w-sm mb-4">
            Lidhuni me llogarinë tuaj Google me leje për të lexuar dhe shkruar në Google Sheets për të automatizuar magazinën.
          </p>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="inline-flex items-center gap-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2 px-3.5 rounded-xl transition duration-200 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            <span>Hyni me Google</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User profile capsule info */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Google profile" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-slate-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold font-mono">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.displayName || 'Përdorues Google'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
              ID Aktiv
            </span>
          </div>

          {/* Spreadsheet ID / Address parameter input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Spreadsheet ID ose Linku i Fletës</span>
              {spreadsheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold hover:underline"
                >
                  Hap fletën <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={handleSpreadsheetIdChange}
              placeholder="Vendosni URL-në e fletës ose Spreadsheet ID"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150"
            />
          </div>

          {/* Load progress feedback */}
          {statusMessage && (
            <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2 text-[11px] text-slate-600 animate-pulse font-mono">
              <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Sync actions buttons grid */}
          <div className="grid grid-cols-2 gap-2 pb-1">
            <button
              onClick={handleImportFromSheets}
              disabled={isLoading || !spreadsheetId}
              className="flex-1 cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 bg-white hover:border-emerald-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-150 disabled:opacity-40 disabled:pointer-events-none"
              title="Klono ose azhorno magazinën lokale nga kjo fletë Google Sheets"
            >
              <CloudDownload className="w-4 h-4 shrink-0 text-amber-500" />
              Importo nga Fleta
            </button>

            <button
              onClick={handleExportToExisting}
              disabled={isLoading || !spreadsheetId}
              className="flex-1 cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 bg-white hover:border-emerald-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-150 disabled:opacity-40 disabled:pointer-events-none"
              title="Ngarko dhe përditëso gjendjen aktuale lokale te ky dokument"
            >
              <CloudUpload className="w-4 h-4 shrink-0 text-emerald-505 text-emerald-600" />
              Përditëso Fletën
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleCreateAndExport}
              disabled={isLoading}
              className="w-full sm:w-auto cursor-pointer flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition duration-150 shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Krijo Fletë të Re & Eksporto
            </button>

            {lastSync && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Sinhronizimi: {lastSync}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
