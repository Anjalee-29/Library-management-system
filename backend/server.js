const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

async function start() {
  const db = require('./config/database');
  await db.init();

  app.use('/api/books', require('./routes/books'));
  app.use('/api/members', require('./routes/members'));
  app.use('/api/transactions', require('./routes/transactions'));

  app.get('/api/stats', (req, res) => {
    try {
      const totalBooks = db.get('SELECT COUNT(*) as v FROM books').v;
      const availableBooks = db.get('SELECT COUNT(*) as v FROM books WHERE available_copies > 0').v;
      const activeMembers = db.get("SELECT COUNT(*) as v FROM members WHERE status = 'active'").v;
      const borrowedBooks = db.get("SELECT COUNT(*) as v FROM transactions WHERE status = 'borrowed'").v;
      const overdueBooks = db.get("SELECT COUNT(*) as v FROM transactions WHERE status = 'borrowed' AND due_date < date('now')").v;
      res.json({ totalBooks, availableBooks, activeMembers, borrowedBooks, overdueBooks });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });

  app.listen(PORT, () => {
    console.log(`📚 Library Management System running at http://localhost:${PORT}`);
  });
}

start().catch(e => { console.error('Startup error:', e); process.exit(1); });
