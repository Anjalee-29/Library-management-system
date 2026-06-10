const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = 'SELECT * FROM members WHERE 1=1';
    const p = [];
    if (search) { sql += ' AND (name LIKE ? OR email LIKE ? OR member_id LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status) { sql += ' AND status = ?'; p.push(status); }
    sql += ' ORDER BY name ASC';
    res.json(db.all(sql, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const member = db.get('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const transactions = db.all(
      'SELECT t.*, b.title, b.author, b.isbn FROM transactions t JOIN books b ON t.book_id = b.id WHERE t.member_id = ? ORDER BY t.created_at DESC',
      [req.params.id]
    );
    res.json({ ...member, transactions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const count = db.get('SELECT COUNT(*) as c FROM members').c;
    const memberId = `LIB-${String(count + 1).padStart(3, '0')}`;
    const r = db.run('INSERT INTO members (member_id,name,email,phone,address) VALUES (?,?,?,?,?)', [memberId, name, email, phone||null, address||null]);
    res.status(201).json(db.get('SELECT * FROM members WHERE id = ?', [r.lastID]));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const member = db.get('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const { name, email, phone, address, status } = req.body;
    db.run('UPDATE members SET name=?,email=?,phone=?,address=?,status=? WHERE id=?',
      [name||member.name, email||member.email, phone||member.phone, address||member.address, status||member.status, req.params.id]);
    res.json(db.get('SELECT * FROM members WHERE id = ?', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    const active = db.get("SELECT COUNT(*) as c FROM transactions WHERE member_id = ? AND status = 'borrowed'", [req.params.id]);
    if (active.c > 0) return res.status(400).json({ error: 'Cannot delete: member has active borrowings' });
    db.run('DELETE FROM members WHERE id = ?', [req.params.id]);
    res.json({ message: 'Member deleted successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
