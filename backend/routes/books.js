const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', (req, res) => {
  try {
    const { search, genre } = req.query;
    let sql = 'SELECT * FROM books WHERE 1=1';
    const p = [];
    if (search) { sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (genre) { sql += ' AND genre = ?'; p.push(genre); }
    sql += ' ORDER BY title ASC';
    res.json(db.all(sql, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/meta/genres', (req, res) => {
  try {
    res.json(db.all('SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre').map(r => r.genre));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.get('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Book not found' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { isbn, title, author, genre, publisher, year, total_copies, description } = req.body;
    if (!isbn || !title || !author) return res.status(400).json({ error: 'ISBN, title, and author are required' });
    const r = db.run(
      'INSERT INTO books (isbn,title,author,genre,publisher,year,total_copies,available_copies,description) VALUES (?,?,?,?,?,?,?,?,?)',
      [isbn, title, author, genre||null, publisher||null, year||null, total_copies||1, total_copies||1, description||null]
    );
    res.status(201).json(db.get('SELECT * FROM books WHERE id = ?', [r.lastID]));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'ISBN already exists' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const book = db.get('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    const { isbn, title, author, genre, publisher, year, total_copies, description } = req.body;
    const newTotal = total_copies || book.total_copies;
    const diff = newTotal - book.total_copies;
    const newAvail = Math.max(0, book.available_copies + diff);
    db.run(
      'UPDATE books SET isbn=?,title=?,author=?,genre=?,publisher=?,year=?,total_copies=?,available_copies=?,description=? WHERE id=?',
      [isbn||book.isbn, title||book.title, author||book.author, genre||book.genre, publisher||book.publisher, year||book.year, newTotal, newAvail, description||book.description, req.params.id]
    );
    res.json(db.get('SELECT * FROM books WHERE id = ?', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    const book = db.get('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    const active = db.get("SELECT COUNT(*) as c FROM transactions WHERE book_id = ? AND status = 'borrowed'", [req.params.id]);
    if (active.c > 0) return res.status(400).json({ error: 'Cannot delete: book has active borrowings' });
    db.run('DELETE FROM books WHERE id = ?', [req.params.id]);
    res.json({ message: 'Book deleted successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
