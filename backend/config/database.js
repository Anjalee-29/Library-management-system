const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/library.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

class Database {
  constructor() { this.db = null; }

  async init() {
    const SQL = await initSqlJs();
    if (fs.existsSync(dbPath)) {
      const buf = fs.readFileSync(dbPath);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }
    console.log('✅ Connected to SQLite database');
    this._initSchema();
    this._seed();
    setInterval(() => this._save(), 5000);
    return this;
  }

  _save() {
    if (!this.db) return;
    fs.writeFileSync(dbPath, Buffer.from(this.db.export()));
  }

  _initSchema() {
    this.db.run(`CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT, isbn TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL, author TEXT NOT NULL, genre TEXT, publisher TEXT,
      year INTEGER, total_copies INTEGER DEFAULT 1, available_copies INTEGER DEFAULT 1,
      description TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`);
    this.db.run(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT, address TEXT,
      status TEXT DEFAULT 'active', joined_date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    this.db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL, borrow_date TEXT DEFAULT (date('now')),
      due_date TEXT NOT NULL, return_date TEXT, status TEXT DEFAULT 'borrowed',
      fine REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    )`);
  }

  _seed() {
    const r = this.db.exec('SELECT COUNT(*) as c FROM books');
    if (r[0]?.values[0][0] > 0) return;
    const books = [
      ['978-0-7432-7356-5','The Great Gatsby','F. Scott Fitzgerald','Fiction','Scribner',1925,3,3,'A story of Jay Gatsby.'],
      ['978-0-06-112008-4','To Kill a Mockingbird','Harper Lee','Fiction','HarperCollins',1960,4,4,'About racial injustice.'],
      ['978-0-452-28423-4','1984','George Orwell','Dystopian','Signet Classic',1949,5,5,'A dystopian novel.'],
      ['978-0-7432-7357-2','Pride and Prejudice','Jane Austen','Romance','Penguin',1813,3,3,'A romantic novel.'],
      ['978-0-14-028329-7','The Catcher in the Rye','J.D. Salinger','Fiction','Little, Brown',1951,2,2,'Adolescent alienation.'],
      ['978-0-7432-7000-7','Brave New World','Aldous Huxley','Dystopian','Harper Perennial',1932,3,3,'Dystopian fiction.'],
      ['978-0-374-52921-5','The Alchemist','Paulo Coelho','Fiction','HarperOne',1988,4,4,'Following your dreams.'],
      ['978-0-06-093546-9','Sapiens','Yuval Noah Harari','Non-Fiction','Harper',2011,3,3,'Brief history of humankind.'],
    ];
    books.forEach(b => { try { this.db.run('INSERT INTO books (isbn,title,author,genre,publisher,year,total_copies,available_copies,description) VALUES (?,?,?,?,?,?,?,?,?)', b); } catch(e){} });
    [['LIB-001','Alice Johnson','alice@example.com','555-0101','123 Main St'],
     ['LIB-002','Bob Smith','bob@example.com','555-0102','456 Oak Ave'],
     ['LIB-003','Carol White','carol@example.com','555-0103','789 Pine Rd'],
     ['LIB-004','David Brown','david@example.com','555-0104','321 Elm St']
    ].forEach(m => { try { this.db.run('INSERT INTO members (member_id,name,email,phone,address) VALUES (?,?,?,?,?)', m); } catch(e){} });
    this._save();
    console.log('🌱 Database seeded');
  }

  run(sql, params = []) {
    this.db.run(sql, params);
    this._save();
    const lid = this.db.exec('SELECT last_insert_rowid() as id');
    return { lastID: lid[0]?.values[0][0], changes: this.db.getRowsModified() };
  }

  get(sql, params = []) {
    const res = this.db.exec(sql, params);
    if (!res.length || !res[0].values.length) return null;
    return Object.fromEntries(res[0].columns.map((c, i) => [c, res[0].values[0][i]]));
  }

  all(sql, params = []) {
    const res = this.db.exec(sql, params);
    if (!res.length) return [];
    return res[0].values.map(row => Object.fromEntries(res[0].columns.map((c, i) => [c, row[i]])));
  }
}

module.exports = new Database();
