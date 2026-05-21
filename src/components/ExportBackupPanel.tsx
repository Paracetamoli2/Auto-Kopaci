/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  FileCode, 
  Github, 
  Info, 
  Terminal, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { Article, Movement, Order, Payment } from '../types';

interface ExportBackupPanelProps {
  articles: Article[];
  movements: Movement[];
  orders: Order[];
  payments: Payment[];
  onImportBackup: (importedData: {
    articles: Article[];
    movements: Movement[];
    orders: Order[];
    payments: Payment[];
  }) => Promise<boolean>;
  onResetDatabase: () => Promise<boolean>;
  showFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export function ExportBackupPanel({
  articles,
  movements,
  orders,
  payments,
  onImportBackup,
  onResetDatabase,
  showFeedback
}: ExportBackupPanelProps) {
  const [activeTab, setActiveTab] = useState<'DATABASE' | 'CODE' | 'GUIDE'>('DATABASE');
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Export current state as a backup JSON file
  const handleExportJSON = () => {
    try {
      const backupData = {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        data: {
          articles,
          movements,
          orders,
          payments
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_inventari_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showFeedback('Databaza u eksportua me sukses si skedar JSON!', 'success');
    } catch (err) {
      console.error(err);
      showFeedback('Dështoi eksportimi i databazës në JSON.', 'error');
    }
  };

  // 2. Export current state as a runnable SQL insert script
  const handleExportSQL = () => {
    try {
      let sqlContent = `-- ==========================================
-- BACKUP SQL I DATABAZES SE MAGAZINES (AUTO SERVIS)
-- Gjeneruar më: ${new Date().toLocaleString('sq-AL')}
-- ==========================================\n\n`;

      // SQL Schema DDL
      sqlContent += `-- 1. Krijimi i Tabelave
CREATE TABLE IF NOT EXISTS articles (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  purchasePrice REAL NOT NULL DEFAULT 0,
  salePrice REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Cope',
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  articleCode TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  client TEXT,
  repairNo TEXT,
  unit TEXT,
  date TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  supplier TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  items TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL
);\n\n`;

      // SQL DML: Insert Records
      sqlContent += `-- 2. Populimi i shembujve e të dhënave aktuale të magazinës\n`;
      sqlContent += `BEGIN TRANSACTION;\n\n`;

      // Articles inserts
      if (articles.length > 0) {
        sqlContent += `-- 2.1 Artikujt aktualë (${articles.length})\n`;
        articles.forEach(a => {
          const nameSafe = a.name.replace(/'/g, "''");
          const codeSafe = a.code.replace(/'/g, "''");
          const catSafe = a.category.replace(/'/g, "''");
          const unitSafe = (a.unit || 'Cope').replace(/'/g, "''");
          const dateSafe = (a.createdAt || '').replace(/'/g, "''");
          sqlContent += `INSERT INTO articles (code, name, category, quantity, purchasePrice, salePrice, unit, createdAt) VALUES ('${codeSafe}', '${nameSafe}', '${catSafe}', ${a.quantity}, ${a.purchasePrice}, ${a.salePrice}, '${unitSafe}', '${dateSafe}') ON CONFLICT(code) DO UPDATE SET quantity=excluded.quantity, purchasePrice=excluded.purchasePrice, salePrice=excluded.salePrice;\n`;
        });
        sqlContent += `\n`;
      }

      // Movements inserts
      if (movements.length > 0) {
        sqlContent += `-- 2.2 Lëvizjet në historik (${movements.length})\n`;
        movements.forEach(m => {
          const codeSafe = m.articleCode.replace(/'/g, "''");
          const typeSafe = m.type.replace(/'/g, "''");
          const clientSafe = (m.client || '').replace(/'/g, "''");
          const repSafe = (m.repairNo || '').replace(/'/g, "''");
          const unitSafe = (m.unit || 'Cope').replace(/'/g, "''");
          const dateSafe = (m.date || '').replace(/'/g, "''");
          sqlContent += `INSERT INTO movements (articleCode, type, quantity, client, repairNo, unit, date) VALUES ('${codeSafe}', '${typeSafe}', ${m.quantity}, '${clientSafe}', '${repSafe}', '${unitSafe}', '${dateSafe}');\n`;
        });
        sqlContent += `\n`;
      }

      // Orders inserts
      if (orders.length > 0) {
        sqlContent += `-- 2.3 Porositë e kryera (${orders.length})\n`;
        orders.forEach(o => {
          const suppSafe = o.supplier.replace(/'/g, "''");
          const dateSafe = o.date.replace(/'/g, "''");
          const compVal = o.completed ? 1 : 0;
          const itemsJSON = JSON.stringify(o.items).replace(/'/g, "''");
          sqlContent += `INSERT INTO orders (id, supplier, date, completed, total, items) VALUES (${o.id}, '${suppSafe}', '${dateSafe}', ${compVal}, ${o.total}, '${itemsJSON}') ON CONFLICT(id) DO UPDATE SET completed=excluded.completed;\n`;
        });
        sqlContent += `\n`;
      }

      // Payments inserts
      if (payments.length > 0) {
        sqlContent += `-- 2.4 Pagesat e loguara ndaj furnitorëve (${payments.length})\n`;
        payments.forEach(p => {
          const suppSafe = p.supplier.replace(/'/g, "''");
          const dateSafe = p.date.replace(/'/g, "''");
          sqlContent += `INSERT INTO payments (supplier, amount, date) VALUES ('${suppSafe}', ${p.amount}, '${dateSafe}');\n`;
        });
        sqlContent += `\n`;
      }

      sqlContent += `COMMIT;\n`;

      const blob = new Blob([sqlContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `skema_struktura_dhe_stoku_${new Date().toISOString().split('T')[0]}.sql`;
      link.click();
      URL.revokeObjectURL(url);
      showFeedback('U eksportua skedari SQL (Skema + Të Dhënat) me sukses!', 'success');
    } catch (err) {
      console.error(err);
      showFeedback('Dështoi krijimi ose shkarkimi i skedarit SQL.', 'error');
    }
  };

  // 3. Import JSON system-wide backup file
  const processImportedFile = async (file: File) => {
    if (!file) return;
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backupObj = JSON.parse(text);

        if (!backupObj || !backupObj.data) {
          throw new Error('Ky skedar nuk ka formatin rregullt të një backup-i të përshtatshëm.');
        }

        const data = backupObj.data;
        const confirmMsg = `Kujdes: Po importoni një rezervim të plotë të databazës nga data ${new Date(backupObj.exportedAt).toLocaleString()}.\nKjo do të integrojë artikujt dhe transaksionet në sistem. A jeni të sigurt që dëshironi të vazhdoni?`;
        
        if (window.confirm(confirmMsg)) {
          const success = await onImportBackup({
            articles: data.articles || [],
            movements: data.movements || [],
            orders: data.orders || [],
            payments: data.payments || []
          });

          if (success) {
            showFeedback('Sukses! Databaza juaj u rikthye plotësisht nga skedari i backup-it.', 'success');
          } else {
            showFeedback('Sinkronizimi i backup-it dështoi në nivel serveri.', 'error');
          }
        }
      } catch (err: any) {
        console.error(err);
        showFeedback(err.message || 'Gabim gjatë leximit dhe analizëm së vlerave të skedarit JSON.', 'error');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImportedFile(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImportedFile(e.target.files[0]);
    }
  };

  const selectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Panelet e Eksportimit të Plotë & Kodit</h3>
            <p className="text-[11px] text-slate-500">Mundësi shkarkimi të plotë të programit, bazës së të dhënave SQLite dhe Backup-it JSON.</p>
          </div>
        </div>

        {/* Tabs picker navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'DATABASE' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Databaza & SQL
          </button>
          <button
            onClick={() => setActiveTab('CODE')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'CODE' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kodi Burimor
          </button>
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'GUIDE' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Udhëzuesi Lokal
          </button>
        </div>
      </div>

      {/* Tab 1: Database and file structures */}
      {activeTab === 'DATABASE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Download/Export Section */}
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold border border-blue-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Eksportimi Kosh klandestin
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-2.5 mb-1.5">Gjenero dhe Shkarko Rezervimet e Stokut</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  Zgjidhni formatin e duhur për të transferuar apo ruajtur të dhënat tuaja. Mund t'i hapni ato në Excel, SQLite, apo mjedise të tjera kudo që dëshironi.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={handleExportJSON}
                  className="w-full cursor-pointer hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 bg-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center justify-between transition duration-150 group"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Eksporto si JSON (Rezervim i Plotë)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono group-hover:text-blue-500">.json backup</span>
                </button>

                <button
                  onClick={handleExportSQL}
                  className="w-full cursor-pointer hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-200 hover:border-slate-800 bg-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center justify-between transition duration-150 group"
                >
                  <span className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-505 text-emerald-600 group-hover:text-emerald-400 shrink-0" />
                    <span>Eksporto si SQL Script (Skemë + Të Dhënat)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono group-hover:text-slate-300">.sql dump</span>
                </button>
              </div>
            </div>

            {/* Upload/Import Section with Drag & Drop */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed p-5 rounded-2xl flex flex-col justify-between items-center text-center transition-all ${
                dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="my-auto py-2">
                <div className="mx-auto w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                  {isImporting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">Rikthe Databazën nga JSON</h4>
                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed mb-3">
                  Tërhiqni skedarin tuaj <span className="font-mono text-blue-600 font-bold">.json</span> të shkarkuar me parë këtu për të rikthyer automatikisht të gjithë sistemin.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={onFileInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={selectFile}
                  disabled={isImporting}
                  className="cursor-pointer bg-white border border-slate-350 hover:bg-slate-50 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition"
                >
                  Zgjidh vetë skedarin
                </button>
              </div>
            </div>
          </div>

          {/* Quick statistics checklist */}
          <div className="bg-blue-50/50 border border-blue-105 border-blue-100 p-4 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-700 leading-normal">
              <span className="font-bold text-slate-800">Gjendja aktuale e regjistrimeve për eksportim:</span>
              <ul className="list-disc list-inside mt-1.5 space-y-1 font-mono text-[11px] text-slate-600">
                <li>Artikuj në Magazinë: <span className="font-bold text-blue-600">{articles.length}</span></li>
                <li>Historiku i Lëvizjeve: <span className="font-bold text-blue-600">{movements.length}</span> lëvizje</li>
                <li>Porosi të Krijuara: <span className="font-bold text-blue-600">{orders.length}</span> fletë-porosi</li>
                <li>Pagesa të Dokumentuara: <span className="font-bold text-blue-600">{payments.length}</span> transaksione</li>
              </ul>
            </div>
          </div>

          {/* Danger Zone / Zona e Rrezikut */}
          <div className="border border-red-200 bg-red-50/40 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 text-red-650 rounded-lg shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-950">Zona e Rrezikut: Rinis/Reseto të gjithë Databazën</h4>
                <p className="text-[11px] text-red-700/80 leading-relaxed mt-0.5">
                  Kjo do të fshijë përgjithmonë të gjithë artikujt nga stoku, lëvizjet e historikut, fletë-porositë e krijuara dhe pagesat. Çdo gjë do të riniset nga e para. Ky veprim është i pakthyeshëm.
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={async () => {
                const conf1 = window.confirm("⚠️ Paralajmërim: A jeni absolutisht i sigurt që dëshironi të fshini të GJIThË të dhënat e magazinës (Artikujt, Historikun, Porositë)?");
                if (conf1) {
                  const conf2 = window.confirm("🛑 Ky hap është i pakthyeshëm! Klikoni OK për ta resetuar databazën plotësisht.");
                  if (conf2) {
                    const success = await onResetDatabase();
                    if (success) {
                      showFeedback("Baza e të dhënave u pastrua me sukses! Çdo gjë u rikthye në fillim.", "success");
                    } else {
                      showFeedback("Dështoi pastrimi ose rinisja e bazës së të dhënave.", "error");
                    }
                  }
                }
              }}
              className="cursor-pointer text-center md:whitespace-nowrap bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition duration-150 shadow-md shadow-red-100 self-stretch md:self-auto"
            >
              Fshi Gjithçka (Reset)
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Export source code */}
      {activeTab === 'CODE' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-205 border-slate-200">
            <div className="flex items-center gap-2 mb-2 text-slate-800 font-bold">
              <Github className="w-4 h-4 text-slate-700" />
              <span>Programi juaj ndodhet tashmë në GitHub!</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
              Ju e keni ngarkuar programin në rregull me të gjithë historikun në platformën GitHub privat 
              nën llogarinë tuaj (<span className="font-bold">Auto-Kopaci</span>). Për ta shkarkuar si skedar ZIP dhe ta keni në telefon ose kompjuter, ndiqni hapat e thjeshtë:
            </p>

            <ol className="list-decimal list-inside space-y-2 leading-relaxed text-[11px] text-slate-600 bg-white p-3.5 rounded-lg border border-slate-150">
              <li>Shkoni tek faqja e GitHub e paraqitur në ekranin tuaj.</li>
              <li>Klikoni mbi butonin e gjelbër të kodit me emrin <span className="bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">&#60;&#62; Code</span> në krye të djathtë të faqes.</li>
              <li>Zgjidhni opsionin e fundit <span className="font-bold">"Download ZIP"</span>.</li>
              <li>Ekstraktoni skedarin e shkarkuar në kompjuter ose telefon për të parë dhe modifikuar kodin.</li>
            </ol>
          </div>

          <div className="bg-slate-55 bg-slate-100 p-4 rounded-xl border border-dashed border-slate-350 flex items-start gap-3">
            <Terminal className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-slate-800 mb-1 text-[11px]">Metoda tjetër: Eksportim Direkt nga Mjedisi AI Studio</h5>
              <p className="text-[11px] text-slate-500 leading-normal">
                Mund të shkarkoni direkt projektin në sekondë direkt nga ky dritare duke shkuar në menunë kryesore të AI Studio (në cepin e djathtë lart), klikoni mbi <span className="font-bold text-blue-600">Settings/Export</span> dhe zgjidhni <span className="font-bold">"Export ZIP" / "Export GitHub"</span>. Kjo do të marrë kodin burimor bashkë me të gjitha strukturat e magazinës aktuale.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Local Hosting Guides */}
      {activeTab === 'GUIDE' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-55 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-blue-600" />
              <span>Si ta hapni dhe xhironi programin në kompjuterin tuaj lokal</span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-4">
              Projekti bazohet në <strong className="text-slate-700">React + TypeScript + Express Full-Stack Server</strong>. Për t'u përgatitur, instaloni paketën bazë falas <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">Node.js (LTS)</a> në PC tuaj dhe xhironi këto komanda rresht pas rreshti në terminal:
            </p>

            {/* Terminal snippet container */}
            <div className="bg-slate-900 text-slate-100 rounded-lg p-3.5 font-mono text-[10px] space-y-2 overflow-x-auto shadow-inner border border-slate-850">
              <p className="text-slate-500"># 1. Shkoni te dritarja ku keni shkarkuar dhe ekstraktuar skedarët</p>
              <p className="text-blue-400">cd auto-kopaci-magazina</p>
              <p className="text-slate-500"># 2. Instaloni të gjitha paketat e kërkuara për lëshimin</p>
              <p className="text-emerald-400">npm install</p>
              <p className="text-slate-500"># 3. Nisni serverin e brendshëm SQLite dhe ndërfaqen së bashku</p>
              <p className="text-amber-400">npm run dev</p>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal mt-3">
              * Shënim: Sapo terminali të tregojë se serveri u nis, hapni adresën <strong className="text-slate-600">http://localhost:3000</strong> në çdo lloj browseri të pajisjes suaj (ose telefonit nëse është në të njëjtin rrjet Wi-Fi).
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">Pse shfaqet "You don't have access" në telefonin Android?</span>
              <p className="mt-1">
                Kjo ndodh sepse keni hyrë në rrjet nëpërmjet linkut privat të zhvillimit (Development / Private Preview) i cili kërkon autorizim të plotë me llogarinë tuaj të zhvilluesit të regjistruar në AI Studio. 
              </p>
              <p className="mt-1.5 font-bold">Zgjedhjet e shpejta:</p>
              <ul className="list-disc list-inside mt-1 ml-1 space-y-1">
                <li>Klikoni butonin e madh <strong className="text-slate-800">Share (Shpërndaj)</strong> në krye të dritares së AI Studio për të krijuar një <strong className="text-slate-800">Shared Link publik</strong> të cilin mund ta hapni pa asnjë pengesë apo fjalëkalim në çdo celular apo tablet!</li>
                <li>Ose përndryshe, eksportoni databazën si skedar JSON nga ky panel si mbrojtje shtesë të dhënash!</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
