const express = require('express');
const router = express.Router();
const db = require('../config/database');

const FINE_PER_DAY = 1.00;
const today = () => new Date().toISOString().split('T')[0];

router.get('/', (req, res) => {
  try {
    const { status, member_id, book_id } = req.query;
    let sql = `SELECT t.*, b.title, b.author, b.isbn, m.name as member_name, m.member_id as member_code
               FROM transactions t JOIN books b ON t.book_id = b.id JOIN members m ON t.member_id = m.id WHERE 1=1`;
    const p = [];
    if (status) { sql += ' AND t.status = ?'; p.push(status); }
    if (member_id) { sql += ' AND t.member_id = ?'; p.push(member_id); }
    if (book_id) { sql += ' AND t.book_id = ?'; p.push(book_id); }
    sql += ' ORDER BY t.created_at DESC';
    let rows = db.all(sql, p);
    const now = today();
    rows = rows.map(row => {
      if (row.status === 'borrowed' && row.due_date < now) {
        const days = Math.ceil((new Date(now) - new Date(row.due_date)) / 86400000);
        row.current_fine = days * FINE_PER_DAY;
      } else { row.current_fine = row.fine || 0; }
      return row;
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.get(
      `SELECT t.*, b.title, b.author, b.isbn, m.name as member_name, m.member_id as member_code
       FROM transactions t JOIN books b ON t.book_id = b.id JOIN members m ON t.member_id = m.id WHERE t.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Transaction not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/borrow', (req, res) => {
  try {
    const { book_id, member_id, due_days = 14 } = req.body;
    if (!book_id || !member_id) return res.status(400).json({ error: 'book_id and member_id are required' });

    const member = db.get("SELECT * FROM members WHERE id = ? AND status = 'active'", [member_id]);
    if (!member) return res.status(404).json({ error: 'Member not found or inactive' });

    const activeCount = db.get("SELECT COUNT(*) as c FROM transactions WHERE member_id = ? AND status = 'borrowed'", [member_id]);
    if (activeCount.c >= 3) return res.status(400).json({ error: 'Member has reached maximum borrowing limit (3 books)' });

    const book = db.get('SELECT * FROM books WHERE id = ? AND available_copies > 0', [book_id]);
    if (!book) return res.status(404).json({ error: 'Book not found or not available' });

    const existing = db.get("SELECT * FROM transactions WHERE book_id = ? AND member_id = ? AND status = 'borrowed'", [book_id, member_id]);
    if (existing) return res.status(400).json({ error: 'Member already has this book borrowed' });

    const dueDate = new Date(Date.now() + due_days * 86400000).toISOString().split('T')[0];
    const r = db.run("INSERT INTO transactions (book_id,member_id,borrow_date,due_date,status) VALUES (?,?,date('now'),?,'borrowed')", [book_id, member_id, dueDate]);
    db.run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id]);

    const txn = db.get(
      'SELECT t.*, b.title, b.author, m.name as member_name FROM transactions t JOIN books b ON t.book_id = b.id JOIN members m ON t.member_id = m.id WHERE t.id = ?',
      [r.lastID]
    );
    res.status(201).json(txn);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/return', (req, res) => {
  try {
    const txn = db.get("SELECT * FROM transactions WHERE id = ? AND status = 'borrowed'", [req.params.id]);
    if (!txn) return res.status(404).json({ error: 'Active transaction not found' });

    const now = today();
    let fine = 0;
    if (now > txn.due_date) {
      const days = Math.ceil((new Date(now) - new Date(txn.due_date)) / 86400000);
      fine = days * FINE_PER_DAY;
    }

    db.run("UPDATE transactions SET status='returned', return_date=?, fine=? WHERE id=?", [now, fine, req.params.id]);
    db.run('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [txn.book_id]);

    const updated = db.get(
      'SELECT t.*, b.title, b.author, m.name as member_name FROM transactions t JOIN books b ON t.book_id = b.id JOIN members m ON t.member_id = m.id WHERE t.id = ?',
      [req.params.id]
    );
    res.json({ ...updated, message: fine > 0 ? `Book returned with $${fine.toFixed(2)} fine` : 'Book returned successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
