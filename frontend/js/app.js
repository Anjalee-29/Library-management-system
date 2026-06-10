const API = '/api';

// ===== NAVIGATION =====
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  document.querySelector(`[data-page="${name}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = name.charAt(0).toUpperCase() + name.slice(1);

  const loaders = { dashboard: loadDashboard, books: loadBooks, members: loadMembers, transactions: () => loadTransactions(''), overdue: loadOverdue };
  if (loaders[name]) loaders[name]();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    showPage(item.dataset.page);
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('menuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===== API HELPERS =====
async function apiFetch(url, opts = {}) {
  const res = await fetch(API + url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#ef4444' : '#1e293b';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const s = await apiFetch('/stats');
    document.getElementById('stat-total').textContent = s.totalBooks;
    document.getElementById('stat-available').textContent = s.availableBooks;
    document.getElementById('stat-members').textContent = s.activeMembers;
    document.getElementById('stat-borrowed').textContent = s.borrowedBooks;
    document.getElementById('stat-overdue').textContent = s.overdueBooks;

    const txns = await apiFetch('/transactions?status=borrowed');
    const recent = txns.slice(0, 5);
    const el = document.getElementById('recent-transactions');
    if (!recent.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No active borrowings</p></div>';
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>Book</th><th>Member</th><th>Due Date</th><th>Status</th></tr></thead>
      <tbody>${recent.map(t => `
        <tr>
          <td><strong>${esc(t.title)}</strong></td>
          <td>${esc(t.member_name)}</td>
          <td>${t.due_date}</td>
          <td>${dueBadge(t.due_date)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch (e) { showToast(e.message, true); }
}

// ===== BOOKS =====
let allBooks = [];

async function loadBooks() {
  try {
    allBooks = await apiFetch('/books');
    const genres = await apiFetch('/books/meta/genres');
    const sel = document.getElementById('genreFilter');
    const cur = sel.value;
    sel.innerHTML = '<option value="">All Genres</option>' + genres.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
    if (cur) sel.value = cur;
    renderBooks(allBooks);
  } catch (e) { showToast(e.message, true); }
}

function searchBooks() {
  const q = document.getElementById('bookSearch').value.toLowerCase();
  const g = document.getElementById('genreFilter').value;
  const filtered = allBooks.filter(b =>
    (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.includes(q)) &&
    (!g || b.genre === g)
  );
  renderBooks(filtered);
}

function renderBooks(books) {
  const el = document.getElementById('books-table');
  if (!books.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><p>No books found</p></div>'; return;
  }
  el.innerHTML = `<table>
    <thead><tr><th>ISBN</th><th>Title</th><th>Author</th><th>Genre</th><th>Year</th><th>Copies</th><th>Available</th><th>Actions</th></tr></thead>
    <tbody>${books.map(b => `
      <tr>
        <td><code style="font-size:.8rem">${esc(b.isbn)}</code></td>
        <td><strong>${esc(b.title)}</strong></td>
        <td>${esc(b.author)}</td>
        <td><span class="badge badge-blue">${esc(b.genre || '—')}</span></td>
        <td>${b.year || '—'}</td>
        <td>${b.total_copies}</td>
        <td><span class="badge ${b.available_copies > 0 ? 'badge-green' : 'badge-red'}">${b.available_copies}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openBookModal(${b.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteBook(${b.id})">Del</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function openBookModal(id = null) {
  document.getElementById('bookId').value = id || '';
  document.getElementById('bookModalTitle').textContent = id ? 'Edit Book' : 'Add Book';
  document.getElementById('bookError').textContent = '';
  if (id) {
    const b = allBooks.find(x => x.id === id);
    if (b) {
      document.getElementById('bookIsbn').value = b.isbn;
      document.getElementById('bookTitle').value = b.title;
      document.getElementById('bookAuthor').value = b.author;
      document.getElementById('bookGenre').value = b.genre || '';
      document.getElementById('bookPublisher').value = b.publisher || '';
      document.getElementById('bookYear').value = b.year || '';
      document.getElementById('bookCopies').value = b.total_copies;
      document.getElementById('bookDesc').value = b.description || '';
    }
  } else {
    ['bookIsbn','bookTitle','bookAuthor','bookGenre','bookPublisher','bookYear','bookDesc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('bookCopies').value = 1;
  }
  openModal('bookModal');
}

async function saveBook() {
  const id = document.getElementById('bookId').value;
  const data = {
    isbn: document.getElementById('bookIsbn').value.trim(),
    title: document.getElementById('bookTitle').value.trim(),
    author: document.getElementById('bookAuthor').value.trim(),
    genre: document.getElementById('bookGenre').value.trim(),
    publisher: document.getElementById('bookPublisher').value.trim(),
    year: parseInt(document.getElementById('bookYear').value) || null,
    total_copies: parseInt(document.getElementById('bookCopies').value) || 1,
    description: document.getElementById('bookDesc').value.trim()
  };
  try {
    if (id) await apiFetch(`/books/${id}`, { method: 'PUT', body: data });
    else await apiFetch('/books', { method: 'POST', body: data });
    showToast(id ? 'Book updated!' : 'Book added!');
    closeModal(); loadBooks();
  } catch (e) { document.getElementById('bookError').textContent = e.message; }
}

async function deleteBook(id) {
  if (!confirm('Delete this book?')) return;
  try {
    await apiFetch(`/books/${id}`, { method: 'DELETE' });
    showToast('Book deleted'); loadBooks();
  } catch (e) { showToast(e.message, true); }
}

// ===== MEMBERS =====
let allMembers = [];

async function loadMembers() {
  try {
    allMembers = await apiFetch('/members');
    renderMembers(allMembers);
  } catch (e) { showToast(e.message, true); }
}

function searchMembers() {
  const q = document.getElementById('memberSearch').value.toLowerCase();
  renderMembers(allMembers.filter(m =>
    m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.member_id.toLowerCase().includes(q)
  ));
}

function renderMembers(members) {
  const el = document.getElementById('members-table');
  if (!members.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No members found</p></div>'; return;
  }
  el.innerHTML = `<table>
    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${members.map(m => `
      <tr>
        <td><code style="font-size:.8rem">${esc(m.member_id)}</code></td>
        <td><strong>${esc(m.name)}</strong></td>
        <td>${esc(m.email)}</td>
        <td>${esc(m.phone || '—')}</td>
        <td>${m.joined_date}</td>
        <td><span class="badge ${m.status === 'active' ? 'badge-green' : 'badge-gray'}">${m.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openMemberModal(${m.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteMember(${m.id})">Del</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function openMemberModal(id = null) {
  document.getElementById('memberId').value = id || '';
  document.getElementById('memberModalTitle').textContent = id ? 'Edit Member' : 'Add Member';
  document.getElementById('memberError').textContent = '';
  if (id) {
    const m = allMembers.find(x => x.id === id);
    if (m) {
      document.getElementById('memberName').value = m.name;
      document.getElementById('memberEmail').value = m.email;
      document.getElementById('memberPhone').value = m.phone || '';
      document.getElementById('memberAddress').value = m.address || '';
      document.getElementById('memberStatus').value = m.status;
    }
  } else {
    ['memberName','memberEmail','memberPhone','memberAddress'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('memberStatus').value = 'active';
  }
  openModal('memberModal');
}

async function saveMember() {
  const id = document.getElementById('memberId').value;
  const data = {
    name: document.getElementById('memberName').value.trim(),
    email: document.getElementById('memberEmail').value.trim(),
    phone: document.getElementById('memberPhone').value.trim(),
    address: document.getElementById('memberAddress').value.trim(),
    status: document.getElementById('memberStatus').value
  };
  try {
    if (id) await apiFetch(`/members/${id}`, { method: 'PUT', body: data });
    else await apiFetch('/members', { method: 'POST', body: data });
    showToast(id ? 'Member updated!' : 'Member added!');
    closeModal(); loadMembers();
  } catch (e) { document.getElementById('memberError').textContent = e.message; }
}

async function deleteMember(id) {
  if (!confirm('Delete this member?')) return;
  try {
    await apiFetch(`/members/${id}`, { method: 'DELETE' });
    showToast('Member deleted'); loadMembers();
  } catch (e) { showToast(e.message, true); }
}

// ===== TRANSACTIONS =====
let currentFilter = '';

async function loadTransactions(status) {
  currentFilter = status;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    if ((b.textContent.toLowerCase() === (status || 'all'))) b.classList.add('active');
  });
  try {
    const url = status ? `/transactions?status=${status}` : '/transactions';
    const txns = await apiFetch(url);
    renderTransactions(txns);
  } catch (e) { showToast(e.message, true); }
}

function filterTransactions(status) { loadTransactions(status); }

function renderTransactions(txns) {
  const el = document.getElementById('transactions-table');
  if (!txns.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔄</div><p>No transactions found</p></div>'; return;
  }
  el.innerHTML = `<table>
    <thead><tr><th>#</th><th>Book</th><th>Member</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Fine</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${txns.map(t => `
      <tr>
        <td>${t.id}</td>
        <td><strong>${esc(t.title)}</strong><br><small style="color:#64748b">${esc(t.member_code)}</small></td>
        <td>${esc(t.member_name)}</td>
        <td>${t.borrow_date}</td>
        <td>${t.due_date}</td>
        <td>${t.return_date || '—'}</td>
        <td>${t.current_fine > 0 ? `<span class="badge badge-red">$${t.current_fine.toFixed(2)}</span>` : '—'}</td>
        <td>${txnStatusBadge(t.status, t.due_date)}</td>
        <td>${t.status === 'borrowed' ? `<button class="btn btn-sm btn-success" onclick="returnBook(${t.id})">Return</button>` : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function openBorrowModal() {
  try {
    const [books, members] = await Promise.all([apiFetch('/books'), apiFetch('/members')]);
    const bSel = document.getElementById('borrowBookId');
    const mSel = document.getElementById('borrowMemberId');
    bSel.innerHTML = '<option value="">Choose a book…</option>' +
      books.filter(b => b.available_copies > 0).map(b => `<option value="${b.id}">${esc(b.title)} by ${esc(b.author)} (${b.available_copies} left)</option>`).join('');
    mSel.innerHTML = '<option value="">Choose a member…</option>' +
      members.filter(m => m.status === 'active').map(m => `<option value="${m.id}">${esc(m.name)} (${esc(m.member_id)})</option>`).join('');
    document.getElementById('borrowDays').value = 14;
    document.getElementById('borrowError').textContent = '';
    openModal('borrowModal');
  } catch (e) { showToast(e.message, true); }
}

async function borrowBook() {
  const data = {
    book_id: parseInt(document.getElementById('borrowBookId').value),
    member_id: parseInt(document.getElementById('borrowMemberId').value),
    due_days: parseInt(document.getElementById('borrowDays').value) || 14
  };
  if (!data.book_id || !data.member_id) {
    document.getElementById('borrowError').textContent = 'Please select both a book and a member.'; return;
  }
  try {
    await apiFetch('/transactions/borrow', { method: 'POST', body: data });
    showToast('Book borrowed successfully!');
    closeModal(); loadTransactions(currentFilter);
  } catch (e) { document.getElementById('borrowError').textContent = e.message; }
}

async function returnBook(id) {
  if (!confirm('Mark this book as returned?')) return;
  try {
    const res = await apiFetch(`/transactions/${id}/return`, { method: 'PUT' });
    showToast(res.message || 'Book returned!');
    loadTransactions(currentFilter);
  } catch (e) { showToast(e.message, true); }
}

// ===== OVERDUE =====
async function loadOverdue() {
  try {
    const txns = await apiFetch('/transactions?status=borrowed');
    const today = new Date().toISOString().split('T')[0];
    const overdue = txns.filter(t => t.due_date < today);
    const el = document.getElementById('overdue-table');
    if (!overdue.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><p>No overdue books!</p></div>'; return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>Book</th><th>Member</th><th>Due Date</th><th>Days Overdue</th><th>Fine</th><th>Actions</th></tr></thead>
      <tbody>${overdue.map(t => {
        const days = Math.ceil((new Date(today) - new Date(t.due_date)) / (1000 * 60 * 60 * 24));
        return `<tr>
          <td><strong>${esc(t.title)}</strong></td>
          <td>${esc(t.member_name)}</td>
          <td><span class="badge badge-red">${t.due_date}</span></td>
          <td>${days} day${days !== 1 ? 's' : ''}</td>
          <td><strong style="color:#ef4444">$${(days * 1).toFixed(2)}</strong></td>
          <td><button class="btn btn-sm btn-success" onclick="returnBook(${t.id}); loadOverdue();">Return</button></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>`;
  } catch (e) { showToast(e.message, true); }
}

// ===== MODAL HELPERS =====
function openModal(id) {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById(id).classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

// ===== UTILITY =====
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function dueBadge(due) {
  const today = new Date().toISOString().split('T')[0];
  if (due < today) return `<span class="badge badge-red">Overdue</span>`;
  const days = Math.ceil((new Date(due) - new Date()) / (1000 * 60 * 60 * 24));
  if (days <= 3) return `<span class="badge badge-yellow">Due soon</span>`;
  return `<span class="badge badge-green">On time</span>`;
}

function txnStatusBadge(status, due) {
  if (status === 'returned') return `<span class="badge badge-gray">Returned</span>`;
  const today = new Date().toISOString().split('T')[0];
  if (due < today) return `<span class="badge badge-red">Overdue</span>`;
  return `<span class="badge badge-blue">Borrowed</span>`;
}

// ===== INIT =====
loadDashboard();
