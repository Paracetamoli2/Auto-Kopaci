import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

// Types for DB fallback mode
interface DBData {
  articles: any[];
  movements: any[];
  orders: any[];
  payments: any[];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Database initialization logic with SQLite-to-JSON fallback cascade
  let db: any = null;
  let useFallback = false;
  const fallbackPath = path.join(process.cwd(), 'database_fallback.json');

  // Helper functions for reading and writing fallback JSON database safely
  const readFallbackDB = async (): Promise<DBData> => {
    try {
      if (!fs.existsSync(fallbackPath)) {
        const initial: DBData = { articles: [], movements: [], orders: [], payments: [] };
        fs.writeFileSync(fallbackPath, JSON.stringify(initial, null, 2), 'utf8');
        return initial;
      }
      const raw = fs.readFileSync(fallbackPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Gabim gjatë leximit të databazës së backup:', err);
      return { articles: [], movements: [], orders: [], payments: [] };
    }
  };

  const writeFallbackDB = async (data: DBData): Promise<void> => {
    try {
      fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Gabim gjatë shkrimit në fletën e backup:', err);
    }
  };

  try {
    console.log('Duke provuar ngarkimin e SQLite për magazinën...');
    
    // Use dynamic import to prevent startup parse crashes if sqlite core binaries are missing
    const { open } = await import('sqlite');
    const sqlite3Pkg = await import('sqlite3');
    
    // Resolve CJS default/wrapped package structure
    const sqlite3 = (sqlite3Pkg as any).default || sqlite3Pkg;

    const dbPath = path.join(process.cwd(), 'database.db');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // DB Schema Migration
    await db.exec(`
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
      );
    `);

    console.log('Baza e të dhënave SQLite u inicializua dhe u migrua me sukses!');
  } catch (err: any) {
    console.warn('VËREJTJE: Inicializimi i SQLite dështoi (mund të jetë për shkak të lidhjeve C++ në këtë mjedis).');
    console.warn(`Arsyeja: ${err.message || err}`);
    console.warn('Mbyllja e SQLite u shmang. Sistemi po kalon automatikisht në backup: database_fallback.json');
    useFallback = true;
  }

  // API Endpoints

  // Get current state for all elements
  app.get('/api/state', async (req, res) => {
    try {
      if (!useFallback) {
        const articles = await db.all('SELECT * FROM articles ORDER BY createdAt DESC');
        const movements = await db.all('SELECT * FROM movements ORDER BY id DESC');
        const payments = await db.all('SELECT * FROM payments ORDER BY id DESC');
        
        const rawOrders = await db.all('SELECT * FROM orders ORDER BY id DESC');
        const orders = rawOrders.map((o: any) => ({
          id: o.id,
          supplier: o.supplier,
          date: o.date,
          completed: o.completed === 1,
          total: o.total,
          items: JSON.parse(o.items)
        }));

        return res.json({ articles, movements, orders, payments });
      } else {
        const data = await readFallbackDB();
        // Sort helper to emulate SQLite orderings
        const articles = [...data.articles].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        const movements = [...data.movements].sort((a, b) => b.id - a.id);
        const payments = [...data.payments].sort((a, b) => b.id - a.id);
        const orders = [...data.orders]
          .sort((a, b) => b.id - a.id)
          .map(o => ({
            ...o,
            completed: !!o.completed
          }));

        return res.json({ articles, movements, orders, payments });
      }
    } catch (err: any) {
      console.error('Error fetching state:', err);
      res.status(500).json({ error: 'Dështoi leximi i të dhënave të magazinës.' });
    }
  });

  // Bulk sync/migration from client LocalStorage
  app.post('/api/sync/import', async (req, res) => {
    try {
      const { articles = [], movements = [], orders = [], payments = [] } = req.body;

      if (!useFallback) {
        await db.run('BEGIN TRANSACTION');

        for (const a of articles) {
          await db.run(
            `INSERT OR REPLACE INTO articles (code, name, category, quantity, purchasePrice, salePrice, unit, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [a.code, a.name, a.category, a.quantity, a.purchasePrice, a.salePrice, a.unit || 'Cope', a.createdAt || new Date().toLocaleString('sq-AL')]
          );
        }

        const currentMovesCountObj = await db.get('SELECT COUNT(*) as count FROM movements');
        if (currentMovesCountObj.count === 0) {
          for (const m of movements) {
            await db.run(
              `INSERT INTO movements (articleCode, type, quantity, client, repairNo, unit, date) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [m.articleCode, m.type, m.quantity, m.client || '', m.repairNo || '', m.unit || 'Cope', m.date || new Date().toLocaleString('sq-AL')]
            );
          }
        }

        for (const o of orders) {
          await db.run(
            `INSERT OR REPLACE INTO orders (id, supplier, date, completed, total, items) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [o.id, o.supplier, o.date, o.completed ? 1 : 0, o.total, JSON.stringify(o.items)]
          );
        }

        const currentPaymentsCountObj = await db.get('SELECT COUNT(*) as count FROM payments');
        if (currentPaymentsCountObj.count === 0) {
          for (const p of payments) {
            await db.run(
              `INSERT INTO payments (supplier, amount, date) VALUES (?, ?, ?)`,
              [p.supplier, p.amount, p.date]
            );
          }
        }

        await db.run('COMMIT');
      } else {
        const data = await readFallbackDB();

        articles.forEach((a: any) => {
          const idx = data.articles.findIndex(x => x.code === a.code);
          if (idx !== -1) data.articles[idx] = a;
          else data.articles.push(a);
        });

        if (data.movements.length === 0) {
          movements.forEach((m: any, i: number) => {
            data.movements.push({ id: i + 1, ...m });
          });
        }

        orders.forEach((o: any) => {
          const idx = data.orders.findIndex(x => x.id === o.id);
          const formatted = { ...o, completed: !!o.completed };
          if (idx !== -1) data.orders[idx] = formatted;
          else data.orders.push(formatted);
        });

        if (data.payments.length === 0) {
          payments.forEach((p: any, i: number) => {
            data.payments.push({ id: i + 1, ...p });
          });
        }

        await writeFallbackDB(data);
      }

      res.json({ success: true, message: 'Sinkronizimi i parë u krye me sukses.' });
    } catch (err: any) {
      if (!useFallback) {
        try { await db.run('ROLLBACK'); } catch {}
      }
      console.error('Sync failure:', err);
      res.status(500).json({ error: 'U ndesh një gabim gjatë sinkronizimit të parë.' });
    }
  });

  // Create or Update Article
  app.post('/api/articles', async (req, res) => {
    try {
      const { code, name, category, quantity, purchasePrice, salePrice, unit, createdAt } = req.body;
      if (!code || !name) {
        return res.status(400).json({ error: 'Kodi dhe emri janë të detyrueshëm.' });
      }

      if (!useFallback) {
        await db.run(
          `INSERT OR REPLACE INTO articles (code, name, category, quantity, purchasePrice, salePrice, unit, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [code, name, category, quantity, purchasePrice, salePrice, unit || 'Cope', createdAt || new Date().toLocaleString('sq-AL')]
        );
      } else {
        const data = await readFallbackDB();
        const existingIdx = data.articles.findIndex(a => a.code === code);
        const article = {
          code,
          name,
          category,
          quantity: Number(quantity || 0),
          purchasePrice: Number(purchasePrice || 0),
          salePrice: Number(salePrice || 0),
          unit: unit || 'Cope',
          createdAt: createdAt || new Date().toLocaleString('sq-AL')
        };
        if (existingIdx !== -1) {
          data.articles[existingIdx] = article;
        } else {
          data.articles.push(article);
        }
        await writeFallbackDB(data);
      }

      res.json({ success: true, article: req.body });
    } catch (err) {
      console.error('Error saving article:', err);
      res.status(500).json({ error: 'Dështoi ruajtja e artikullit.' });
    }
  });

  // Delete Article
  app.delete('/api/articles/:code', async (req, res) => {
    try {
      const { code } = req.params;
      if (!useFallback) {
        await db.run('DELETE FROM articles WHERE code = ?', [code]);
      } else {
        const data = await readFallbackDB();
        data.articles = data.articles.filter(a => a.code !== code);
        await writeFallbackDB(data);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting article:', err);
      res.status(500).json({ error: 'Dështoi fshirja e artikullit.' });
    }
  });

  // Update Article Quantity
  app.patch('/api/articles/:code/quantity', async (req, res) => {
    try {
      const { code } = req.params;
      const { quantity } = req.body;

      if (!useFallback) {
        await db.run('UPDATE articles SET quantity = ? WHERE code = ?', [quantity, code]);
      } else {
        const data = await readFallbackDB();
        const article = data.articles.find(a => a.code === code);
        if (article) {
          article.quantity = Number(quantity);
          await writeFallbackDB(data);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating quantity:', err);
      res.status(500).json({ error: 'Dështoi përditësimi i sasisë.' });
    }
  });

  // Register Stocks Movements
  app.post('/api/movements', async (req, res) => {
    try {
      const movements = req.body; 
      if (!Array.isArray(movements) || movements.length === 0) {
        return res.status(400).json({ error: 'Regjistrimi i lëvizjes kërkon një listë jo-bosh.' });
      }

      if (!useFallback) {
        await db.run('BEGIN TRANSACTION');

        for (const m of movements) {
          const dateStr = m.date || new Date().toLocaleString('sq-AL');
          await db.run(
            `INSERT INTO movements (articleCode, type, quantity, client, repairNo, unit, date) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [m.articleCode, m.type, m.quantity, m.client || '', m.repairNo || '', m.unit || 'Cope', dateStr]
          );

          const qtyToChange = Number(m.quantity);
          if (m.type === 'DALJE') {
            await db.run('UPDATE articles SET quantity = quantity - ? WHERE code = ?', [qtyToChange, m.articleCode]);
          } else {
            await db.run('UPDATE articles SET quantity = quantity + ? WHERE code = ?', [qtyToChange, m.articleCode]);
          }
        }

        await db.run('COMMIT');
      } else {
        const data = await readFallbackDB();
        const maxId = data.movements.reduce((max, m) => m.id > max ? m.id : max, 0);

        movements.forEach((m: any, i: number) => {
          const newM = {
            id: maxId + 1 + i,
            articleCode: m.articleCode,
            type: m.type,
            quantity: Number(m.quantity),
            client: m.client || '',
            repairNo: m.repairNo || '',
            unit: m.unit || 'Cope',
            date: m.date || new Date().toLocaleString('sq-AL')
          };
          data.movements.push(newM);

          const art = data.articles.find(a => a.code === m.articleCode);
          if (art) {
            if (m.type === 'DALJE') {
              art.quantity = Math.max(0, art.quantity - Number(m.quantity));
            } else {
              art.quantity += Number(m.quantity);
            }
          }
        });

        await writeFallbackDB(data);
      }

      res.json({ success: true });
    } catch (err: any) {
      if (!useFallback) {
        try { await db.run('ROLLBACK'); } catch {}
      }
      console.error('Error saving movements:', err);
      res.status(500).json({ error: 'Dështoi regjistrimi i lëvizjeve të stokut.' });
    }
  });

  // Delete specific movement log
  app.delete('/api/movements/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!useFallback) {
        await db.run('DELETE FROM movements WHERE id = ?', [id]);
      } else {
        const data = await readFallbackDB();
        data.movements = data.movements.filter(m => m.id !== Number(id));
        await writeFallbackDB(data);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting movement:', err);
      res.status(500).json({ error: 'Dështoi heqja e lëvizjes.' });
    }
  });

  // Clear all movements logs
  app.post('/api/movements/clear', async (req, res) => {
    try {
      if (!useFallback) {
        await db.run('DELETE FROM movements');
      } else {
        const data = await readFallbackDB();
        data.movements = [];
        await writeFallbackDB(data);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error clearing movements:', err);
      res.status(500).json({ error: 'Dështoi pastrimi i historikut.' });
    }
  });

  // Completely Reset Database (Clear all tables)
  app.post('/api/reset', async (req, res) => {
    try {
      if (!useFallback) {
        await db.run('DELETE FROM articles');
        await db.run('DELETE FROM movements');
        await db.run('DELETE FROM orders');
        await db.run('DELETE FROM payments');
      } else {
        const initialCount: DBData = { articles: [], movements: [], orders: [], payments: [] };
        await writeFallbackDB(initialCount);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error resetting database:', err);
      res.status(500).json({ error: 'Dështoi fshirja e plotë e databazës.' });
    }
  });

  // Delete specific payment endpoint
  app.delete('/api/payments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!useFallback) {
        await db.run('DELETE FROM payments WHERE id = ?', [id]);
      } else {
        const data = await readFallbackDB();
        data.payments = data.payments.filter(p => p.id !== Number(id));
        await writeFallbackDB(data);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting payment:', err);
      res.status(500).json({ error: 'Dështoi fshirja e pagesës.' });
    }
  });

  // Delete specific order endpoint
  app.delete('/api/orders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!useFallback) {
        await db.run('DELETE FROM orders WHERE id = ?', [id]);
      } else {
        const data = await readFallbackDB();
        data.orders = data.orders.filter(o => o.id !== Number(id));
        await writeFallbackDB(data);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting order:', err);
      res.status(500).json({ error: 'Dështoi fshirja e porosisë.' });
    }
  });

  // Bulk deletion administrator endpoint
  app.post('/api/admin/bulk-delete', async (req, res) => {
    try {
      const { type, filterType, filterValue } = req.body;
      if (!type || !filterType) {
        return res.status(400).json({ error: 'Të dhënat janë të paplota.' });
      }

      if (!useFallback) {
        if (type === 'articles') {
          if (filterType === 'all') {
            await db.run('DELETE FROM articles');
          } else if (filterType === 'category') {
            await db.run('DELETE FROM articles WHERE category = ?', [filterValue]);
          } else if (filterType === 'single') {
            await db.run('DELETE FROM articles WHERE code = ?', [filterValue]);
          }
        } else if (type === 'movements') {
          if (filterType === 'all') {
            await db.run('DELETE FROM movements');
          } else if (filterType === 'category') {
            await db.run(`
              DELETE FROM movements 
              WHERE articleCode IN (SELECT code FROM articles WHERE category = ?)
            `, [filterValue]);
          } else if (filterType === 'single') {
            await db.run('DELETE FROM movements WHERE id = ?', [filterValue]);
          }
        } else if (type === 'orders') {
          if (filterType === 'all') {
            await db.run('DELETE FROM orders');
          } else if (filterType === 'category') {
            await db.run('DELETE FROM orders WHERE supplier = ?', [filterValue]);
          } else if (filterType === 'single') {
            await db.run('DELETE FROM orders WHERE id = ?', [filterValue]);
          }
        } else if (type === 'payments') {
          if (filterType === 'all') {
            await db.run('DELETE FROM payments');
          } else if (filterType === 'category') {
            await db.run('DELETE FROM payments WHERE supplier = ?', [filterValue]);
          } else if (filterType === 'single') {
            await db.run('DELETE FROM payments WHERE id = ?', [filterValue]);
          }
        }
      } else {
        const data = await readFallbackDB();
        if (type === 'articles') {
          if (filterType === 'all') {
            data.articles = [];
          } else if (filterType === 'category') {
            data.articles = data.articles.filter(a => a.category !== filterValue);
          } else if (filterType === 'single') {
            data.articles = data.articles.filter(a => a.code !== filterValue);
          }
        } else if (type === 'movements') {
          if (filterType === 'all') {
            data.movements = [];
          } else if (filterType === 'category') {
            const forbiddenCodes = new Set(data.articles.filter(a => a.category === filterValue).map(a => a.code));
            data.movements = data.movements.filter(m => !forbiddenCodes.has(m.articleCode));
          } else if (filterType === 'single') {
            data.movements = data.movements.filter(m => m.id !== Number(filterValue));
          }
        } else if (type === 'orders') {
          if (filterType === 'all') {
            data.orders = [];
          } else if (filterType === 'category') {
            data.orders = data.orders.filter(o => o.supplier !== filterValue);
          } else if (filterType === 'single') {
            data.orders = data.orders.filter(o => o.id !== Number(filterValue));
          }
        } else if (type === 'payments') {
          if (filterType === 'all') {
            data.payments = [];
          } else if (filterType === 'category') {
            data.payments = data.payments.filter(p => p.supplier !== filterValue);
          } else if (filterType === 'single') {
            data.payments = data.payments.filter(p => p.id !== Number(filterValue));
          }
        }
        await writeFallbackDB(data);
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Error during bulk-delete:', err);
      res.status(500).json({ error: 'Fshirja në masë dështoi.' });
    }
  });

  // Create Supply Order
  app.post('/api/orders', async (req, res) => {
    try {
      const o = req.body;
      if (!o.id || !o.supplier) {
        return res.status(400).json({ error: 'Informacioni i poronisë nuk është i plotë.' });
      }

      if (!useFallback) {
        await db.run(
          `INSERT OR REPLACE INTO orders (id, supplier, date, completed, total, items) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [o.id, o.supplier, o.date, o.completed ? 1 : 0, o.total, JSON.stringify(o.items)]
        );
      } else {
        const data = await readFallbackDB();
        const existingIdx = data.orders.findIndex(x => x.id === o.id);
        const order = {
          id: o.id,
          supplier: o.supplier,
          date: o.date,
          completed: !!o.completed,
          total: Number(o.total || 0),
          items: o.items || []
        };
        if (existingIdx !== -1) {
          data.orders[existingIdx] = order;
        } else {
          data.orders.push(order);
        }
        await writeFallbackDB(data);
      }

      res.json({ success: true, order: o });
    } catch (err) {
      console.error('Error creating order:', err);
      res.status(500).json({ error: 'Dështoi krijimi i porosisë.' });
    }
  });

  // Complete Supply Order & Allocate Quantities
  app.post('/api/orders/:id/complete', async (req, res) => {
    try {
      const { id } = req.params;

      if (!useFallback) {
        const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
        if (!order) {
          return res.status(404).json({ error: 'Porosia nuk u gjet.' });
        }

        if (order.completed === 1) {
          return res.status(400).json({ error: 'Kjo porosi është pranuar tashmë.' });
        }

        const items = JSON.parse(order.items);

        await db.run('BEGIN TRANSACTION');

        for (const item of items) {
          const itemCode = item.article.toUpperCase().replace(/\s+/g, '-');
          
          const existing = await db.get('SELECT * FROM articles WHERE name = ? OR code = ?', [item.article, itemCode]);
          if (existing) {
            await db.run('UPDATE articles SET quantity = quantity + ? WHERE code = ?', [Number(item.quantity), existing.code]);
          } else {
            await db.run(
              `INSERT INTO articles (code, name, category, quantity, purchasePrice, salePrice, unit, createdAt) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                itemCode,
                item.article,
                'Shtuar me Porosi',
                Number(item.quantity),
                Number(item.price),
                Math.round(Number(item.price) * 1.3),
                item.unit || 'Cope',
                new Date().toLocaleString('sq-AL')
              ]
            );
          }
        }

        await db.run('UPDATE orders SET completed = 1 WHERE id = ?', [id]);
        await db.run('COMMIT');
      } else {
        const data = await readFallbackDB();
        const order = data.orders.find(o => o.id === Number(id));
        if (!order) {
          return res.status(404).json({ error: 'Porosia nuk u gjet.' });
        }
        if (order.completed) {
          return res.status(400).json({ error: 'Kjo porosi është pranuar tashmë.' });
        }

        for (const item of order.items) {
          const itemCode = item.article.toUpperCase().replace(/\s+/g, '-');
          const existing = data.articles.find(a => a.name.toLowerCase() === item.article.toLowerCase() || a.code === itemCode);
          if (existing) {
            existing.quantity += Number(item.quantity);
          } else {
            data.articles.push({
              code: itemCode,
              name: item.article,
              category: 'Shtuar me Porosi',
              quantity: Number(item.quantity),
              purchasePrice: Number(item.price),
              salePrice: Math.round(Number(item.price) * 1.3),
              unit: item.unit || 'Cope',
              createdAt: new Date().toLocaleString('sq-AL')
            });
          }
        }

        order.completed = true;
        await writeFallbackDB(data);
      }

      res.json({ success: true });
    } catch (err: any) {
      if (!useFallback) {
        try { await db.run('ROLLBACK'); } catch {}
      }
      console.error('Error completing order:', err);
      res.status(500).json({ error: 'Dështoi pranimi i poronisë.' });
    }
  });

  // Create Supplier Payment
  app.post('/api/payments', async (req, res) => {
    try {
      const { supplier, amount, date } = req.body;
      if (!supplier || amount === undefined) {
        return res.status(400).json({ error: 'Të dhënat e pagesës janë të mangëta.' });
      }

      let insertedId = 0;

      if (!useFallback) {
        const result = await db.run(
          `INSERT INTO payments (supplier, amount, date) VALUES (?, ?, ?)`,
          [supplier, amount, date || new Date().toLocaleString('sq-AL')]
        );
        insertedId = result.lastID || Date.now();
      } else {
        const data = await readFallbackDB();
        const maxId = data.payments.reduce((max, p) => p.id > max ? p.id : max, 0);
        insertedId = maxId + 1;
        
        data.payments.push({
          id: insertedId,
          supplier,
          amount: Number(amount),
          date: date || new Date().toLocaleString('sq-AL')
        });
        await writeFallbackDB(data);
      }

      res.json({ success: true, payment: { id: insertedId, supplier, amount, date } });
    } catch (err) {
      console.error('Error saving payment:', err);
      res.status(500).json({ error: 'Dështoi regjistrimi i pagesës.' });
    }
  });

  // Bulk Import for Google Sheets synchronization overwriting
  app.post('/api/sync/sheets-import', async (req, res) => {
    try {
      const articlesList = req.body;
      if (!Array.isArray(articlesList)) {
        return res.status(400).json({ error: 'Të dhënat e importuara duhet të jenë një listë.' });
      }

      if (!useFallback) {
        await db.run('BEGIN TRANSACTION');

        for (const imp of articlesList) {
          await db.run(
            `INSERT OR REPLACE INTO articles (code, name, category, quantity, purchasePrice, salePrice, unit, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              imp.code,
              imp.name,
              imp.category,
              imp.quantity,
              imp.purchasePrice,
              imp.salePrice,
              imp.unit,
              imp.createdAt || new Date().toLocaleString('sq-AL')
            ]
          );
        }

        await db.run('COMMIT');
      } else {
        const data = await readFallbackDB();

        for (const imp of articlesList) {
          const existingIdx = data.articles.findIndex(a => a.code === imp.code);
          const art = {
            code: imp.code,
            name: imp.name,
            category: imp.category,
            quantity: Number(imp.quantity || 0),
            purchasePrice: Number(imp.purchasePrice || 0),
            salePrice: Number(imp.salePrice || 0),
            unit: imp.unit || 'Cope',
            createdAt: imp.createdAt || new Date().toLocaleString('sq-AL')
          };
          if (existingIdx !== -1) {
            data.articles[existingIdx] = art;
          } else {
            data.articles.push(art);
          }
        }

        await writeFallbackDB(data);
      }

      res.json({ success: true, count: articlesList.length });
    } catch (err: any) {
      if (!useFallback) {
        try { await db.run('ROLLBACK'); } catch {}
      }
      console.error('Sheets import backend failure:', err);
      res.status(500).json({ error: 'Gabim gjatë sinkronizimit të backend-it me fletën Google.' });
    }
  });

  // AI Gemini Chat endpoint with auto function calling handling (Tools)
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, history = [], userApiKey } = req.body;
      const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          status: 'key_missing',
          error: 'Ju lutemi vendosni çelësin tuaj GEMINI_API_KEY në opsionet ose në panelin Settings > Secrets të AI Studio për të përdorur asistentin zanor.'
        });
      }

      if (!message) {
        return res.status(400).json({ error: 'Mesazhi nuk mund të jetë bosh.' });
      }

      // Initialize server-side Gemini client
      const aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Declare high quality warehouse tools in Albanian
      const shtoArtikullTool: FunctionDeclaration = {
        name: "shto_artikull",
        description: "Regjistron një artikull (pjesë këmbimi, produkt) të ri në magazinë apo përditëson çmimet e tij.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING, description: "Kodi unik SKU i produktit, p.sh., 'CASTROL-5W30', 'FIL-AJRI-BMW' (konvertohet automatikisht në shkronja të mëdha)" },
            name: { type: Type.STRING, description: "Emri i plotë i produktit të ri në magazinë" },
            category: { type: Type.STRING, description: "Kategoria e produktit (p.sh., Lubrifikant, Filtra, Elektrike, Motor, Aksesore, Sistem Frenimi)" },
            quantity: { type: Type.NUMBER, description: "Sasia fillestare ose sasia që do të jetë në magazinë" },
            purchasePrice: { type: Type.NUMBER, description: "Çmimi i blerjes në euro (€)" },
            salePrice: { type: Type.NUMBER, description: "Çmimi i vlerësuar i shitjes për klientin në euro (€)" },
            unit: { type: Type.STRING, description: "Njësia e matjes, p.sh., 'Cope', 'Liter', 'Set' (mungesa nënkupton 'Cope')" }
          },
          required: ["code", "name", "category", "quantity", "purchasePrice", "salePrice"]
        }
      };

      const regjistroLevizjeTool: FunctionDeclaration = {
        name: "regjistro_levizje",
        description: "Regjistron një lëvizje stoku për hyrje apo dalje (shitje malli ndaj klientit, ose shtim manual).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            articleCode: { type: Type.STRING, description: "Kodi SKU i artikullit që po lëviz (p.sh. CASTROL-5W30)" },
            type: { type: Type.STRING, description: "Lloji i lëvizjes: duhet të jetë vetëm 'HYRJE' ose 'DALJE'" },
            quantity: { type: Type.NUMBER, description: "Sasia e mallit që lëviz" },
            client: { type: Type.STRING, description: "Emri i klientit (mjaft i rëndësishëm sidomos për lëvizjet DALJE / Shitje)" },
            repairNo: { type: Type.STRING, description: "Koment ose shënime të shkurtra për riparimin e kryer (opsionale, p.sh. 'Ndërrim vaji, filtra')" },
            unit: { type: Type.STRING, description: "Njësia e matjes (p.sh., 'Cope')" }
          },
          required: ["articleCode", "type", "quantity"]
        }
      };

      const krijoPorosiTool: FunctionDeclaration = {
        name: "krijo_porosi",
        description: "Krijon një porosi të re furnizimi (porosi aktive) me mallra të ndryshme nga një furnitor por nuk i shton direkt në stok derisa të pranohet.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            supplier: { type: Type.STRING, description: "Emri i kompanisë apo personit furnitor (p.sh. Autopasion, Intercars)" },
            total: { type: Type.NUMBER, description: "Vlera totale e porosisë në euro (€)" },
            items: {
              type: Type.ARRAY,
              description: "Lista e artikujve të porositur",
              items: {
                type: Type.OBJECT,
                properties: {
                  article: { type: Type.STRING, description: "Emri i artikullit të porositur" },
                  quantity: { type: Type.NUMBER, description: "Sasia e porositur" },
                  price: { type: Type.NUMBER, description: "Çmimi i blerjes për njësi në euro (€)" },
                  unit: { type: Type.STRING, description: "Njësia e matjes (p.sh., Cope)" }
                },
                required: ["article", "quantity", "price"]
              }
            }
          },
          required: ["supplier", "total", "items"]
        }
      };

      const regjistroPageseTool: FunctionDeclaration = {
        name: "regjistro_pagese",
        description: "Regjistron një pagesë financiare të kryer ndaj detyrimit të një furnitori.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            supplier: { type: Type.STRING, description: "Emri i furnitorit ndaj të cilit kryhet pagesa" },
            amount: { type: Type.NUMBER, description: "Shuma e paguar në euro (€)" },
            date: { type: Type.STRING, description: "Data e kryerjes së pagesës (opsionale, format DD/MM/YYYY)" }
          },
          required: ["supplier", "amount"]
        }
      };

      const lexoGjendjenStokutTool: FunctionDeclaration = {
        name: "lexo_gjendjen_stokut",
        description: "Lexon të gjithë gjendjen aktuale të magazinës (artikujt e regjistruar, sasinë, çmimet, porositë dhe historikun e lëvizjeve). Thirreni gjithmonë kur përdoruesi pyet sa artikuj ka, cilët janë në gjendje të ulët, sa është vlera totale ose historiku.",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      };

      // Construct message history and current query
      const userMessageContent = { role: 'user', parts: [{ text: message }] };
      const contents = [...history, userMessageContent];

      let refreshNeeded = false;
      const actionsExecuted: string[] = [];
      let loopCount = 0;
      const maxLoops = 5;
      let finalPayload: any = null;

      while (loopCount < maxLoops) {
        loopCount++;

        const response = await aiClient.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: contents,
          config: {
            systemInstruction: "Ju jeni Asistenti Inteligjent AI i 'Auto Servis Kopaçi'. Përdoruesi do të komunikojë me ju kryesisht në Shqip (apo ndonjëherë në Anglisht), me zë ose me shkrim. Detyra juaj kryesore është të kuptoni qëllimin e tyre dhe të kryeni veprime në bazë të kërkesave duke thirrur funksionet 'shto_artikull', 'regjistro_levizje', 'krijo_porosi', 'regjistro_pagese', ose 'lexo_gjendjen_stokut'. Përgjigjuni gjithmonë në Gjuhën Shqipe në mënyrë të qartë, të thjeshtë, profesionale dhe përmbledhëse. Nëse përdoruesi ju kërkon me zë ose me shkrim të shtojë pjesë, bëjë pagesa, ose bëjë urdhër-porosi, përdorni vegla. Pas kryerjes me sukses të veprimit, konfirmoni se çfarë bëtë.",
            tools: [{ functionDeclarations: [shtoArtikullTool, regjistroLevizjeTool, krijoPorosiTool, regjistroPageseTool, lexoGjendjenStokutTool] }],
            toolConfig: { includeServerSideToolInvocations: true }
          }
        });

        const functionCalls = response.functionCalls;
        if (!functionCalls || functionCalls.length === 0) {
          // No more function calls, we have the final human-readable text!
          finalPayload = {
            message: response.text || 'Operacioni u krye me sukses.',
            refreshNeeded,
            actionsExecuted,
            history: [...contents, response.candidates?.[0]?.content]
          };
          break;
        }

        // Execute function calls
        const functionResponses = [];
        for (const call of functionCalls) {
          const { name, args, id } = call;
          let result: any = null;

          try {
            if (name === 'lexo_gjendjen_stokut') {
              let articlesList: any[] = [];
              let movementsList: any[] = [];
              let ordersList: any[] = [];
              let paymentsList: any[] = [];

              if (!useFallback) {
                articlesList = await db.all('SELECT * FROM articles');
                movementsList = await db.all('SELECT * FROM movements');
                paymentsList = await db.all('SELECT * FROM payments');
                const rawOrders = await db.all('SELECT * FROM orders');
                ordersList = rawOrders.map((o: any) => ({
                  id: o.id,
                  supplier: o.supplier,
                  date: o.date,
                  completed: o.completed === 1,
                  total: o.total,
                  items: JSON.parse(o.items)
                }));
              } else {
                const fallbackData = await readFallbackDB();
                articlesList = fallbackData.articles;
                movementsList = fallbackData.movements;
                ordersList = fallbackData.orders;
                paymentsList = fallbackData.payments;
              }

              result = { articles: articlesList, movements: movementsList, orders: ordersList, payments: paymentsList };
            } else if (name === 'shto_artikull') {
              const { code, name: artName, category, quantity, purchasePrice, salePrice, unit } = args as any;
              const codeUpper = String(code).toUpperCase().trim();

              if (!useFallback) {
                await db.run(
                  `INSERT OR REPLACE INTO articles (code, name, category, quantity, purchasePrice, salePrice, unit, createdAt) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [codeUpper, artName, category, Number(quantity || 0), Number(purchasePrice || 0), Number(salePrice || 0), unit || 'Cope', new Date().toLocaleString('sq-AL')]
                );
              } else {
                const data = await readFallbackDB();
                const existingIdx = data.articles.findIndex(a => a.code === codeUpper);
                const item = {
                  code: codeUpper,
                  name: artName,
                  category,
                  quantity: Number(quantity || 0),
                  purchasePrice: Number(purchasePrice || 0),
                  salePrice: Number(salePrice || 0),
                  unit: unit || 'Cope',
                  createdAt: new Date().toLocaleString('sq-AL')
                };
                if (existingIdx !== -1) {
                  data.articles[existingIdx] = item;
                } else {
                  data.articles.push(item);
                }
                await writeFallbackDB(data);
              }

              result = { success: true, message: `Artikulli '${artName}' u regjistrua me kod ${codeUpper}.` };
              refreshNeeded = true;
              actionsExecuted.push(`Shtuar Artikulli i Ri: ${artName} (${codeUpper})`);
            } else if (name === 'regjistro_levizje') {
              const { articleCode, type: movType, quantity, client, repairNo, unit } = args as any;
              const qtyVal = Number(quantity);
              const dateVal = new Date().toLocaleString('sq-AL');
              const codeUpper = String(articleCode).toUpperCase().trim();
              let articleFound = false;

              if (!useFallback) {
                const art = await db.get('SELECT * FROM articles WHERE code = ?', [codeUpper]);
                if (art) {
                  articleFound = true;
                  await db.run('BEGIN TRANSACTION');
                  await db.run(
                    `INSERT INTO movements (articleCode, type, quantity, client, repairNo, unit, date) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [codeUpper, movType, qtyVal, client || '', repairNo || '', unit || 'Cope', dateVal]
                  );
                  if (movType === 'DALJE') {
                    await db.run('UPDATE articles SET quantity = MAX(0, quantity - ?) WHERE code = ?', [qtyVal, codeUpper]);
                  } else {
                    await db.run('UPDATE articles SET quantity = quantity + ? WHERE code = ?', [qtyVal, codeUpper]);
                  }
                  await db.run('COMMIT');
                }
              } else {
                const data = await readFallbackDB();
                const art = data.articles.find(a => a.code === codeUpper);
                if (art) {
                  articleFound = true;
                  const maxId = data.movements.reduce((max, m) => m.id > max ? m.id : max, 0);
                  data.movements.push({
                    id: maxId + 1,
                    articleCode: codeUpper,
                    type: movType,
                    quantity: qtyVal,
                    client: client || '',
                    repairNo: repairNo || '',
                    unit: unit || 'Cope',
                    date: dateVal
                  });
                  if (movType === 'DALJE') {
                    art.quantity = Math.max(0, art.quantity - qtyVal);
                  } else {
                    art.quantity += qtyVal;
                  }
                  await writeFallbackDB(data);
                }
              }

              if (articleFound) {
                result = { success: true, message: `Lëvizja e tipit '${movType}' për sasinë ${qtyVal} u regjistrua me sukses.` };
                refreshNeeded = true;
                actionsExecuted.push(`Regjistruar Lëvizje: ${movType} (${qtyVal} ${unit || 'Cope'})`);
              } else {
                result = { error: `Gabim: Artikulli me kodin '${articleCode}' nuk ekziston në magazinë.` };
              }
            } else if (name === 'krijo_porosi') {
              const { supplier, total, items } = args as any;
              const orderId = Date.now();
              const dateVal = new Date().toLocaleString('sq-AL');

              if (!useFallback) {
                await db.run(
                  `INSERT OR REPLACE INTO orders (id, supplier, date, completed, total, items) 
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [orderId, supplier, dateVal, 0, Number(total || 0), JSON.stringify(items)]
                );
              } else {
                const data = await readFallbackDB();
                data.orders.push({
                  id: orderId,
                  supplier,
                  date: dateVal,
                  completed: false,
                  total: Number(total || 0),
                  items
                });
                await writeFallbackDB(data);
              }

              result = { success: true, orderId, message: `Urdhër-porosia u krijua me sukses.` };
              refreshNeeded = true;
              actionsExecuted.push(`Krijuar Porosi Furnizimi: ${supplier} (€ ${total})`);
            } else if (name === 'regjistro_pagese') {
              const { supplier, amount, date } = args as any;
              const dateVal = date || new Date().toLocaleString('sq-AL');

              if (!useFallback) {
                await db.run(
                  `INSERT INTO payments (supplier, amount, date) VALUES (?, ?, ?)`,
                  [supplier, Number(amount || 0), dateVal]
                );
              } else {
                const data = await readFallbackDB();
                const maxId = data.payments.reduce((max, p) => p.id > max ? p.id : max, 0);
                data.payments.push({
                  id: maxId + 1,
                  supplier,
                  amount: Number(amount || 0),
                  date: dateVal
                });
                await writeFallbackDB(data);
              }

              result = { success: true, message: `U regjistrua pagesa prej € ${amount} për furnitorin '${supplier}'.` };
              refreshNeeded = true;
              actionsExecuted.push(`Regjistruar Pagesë: ${supplier} (€ ${amount})`);
            }
          } catch (ex: any) {
            console.error(`Ekskursion gjatë ekzekutimit të mjetit ${name}:`, ex);
            result = { error: ex.message || String(ex) };
          }

          functionResponses.push({
            name,
            response: { result },
            id
          });
        }

        // Add model's choice to call function & the returned tool output answer to context
        contents.push(response.candidates?.[0]?.content as any);
        contents.push({
          role: 'user', // representing the tool execution role response
          parts: functionResponses.map(f => ({
            functionResponse: {
              name: f.name,
              response: f.response
            }
          }))
        } as any);
      }

      if (!finalPayload) {
        finalPayload = {
          message: 'Më vjen keq, u arrit limiti i thirrjeve të brendshme pa marrë një mesazh përfundimtar.',
          refreshNeeded,
          actionsExecuted,
          history: contents
        };
      }

      res.json(finalPayload);
    } catch (err: any) {
      console.error('Gabim gjatë procesimit të Gemini:', err);
      res.status(500).json({ error: 'Ndodhi një gabim gjatë përpunimit të inteligjencës artificiale: ' + (err.message || String(err)) });
    }
  });


  // Serve frontend files
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve index.html transformed by Vite for any other route in dev mode
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const mode = useFallback ? 'Backup JSON File Mode' : 'Native SQLite Mode';
    console.log(`Bllokuesi u thye. Serveri po punon në mënyrën [${mode}] në adresën: http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Dështoi rinisja e serverit kryesor full-stack:', err);
  process.exit(1);
});
