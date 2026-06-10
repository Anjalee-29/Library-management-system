# 📚 Library Management System

A full-stack **Library Management System** built with **Node.js**, **Express**, **SQLite**, and **Vanilla JavaScript**. Manage books, members, borrowings, returns, and overdue tracking — all from a clean, responsive web interface.

---

## ✨ Features

- **📖 Book Management** — Add, edit, delete books with ISBN, author, genre, copies tracking
- **👥 Member Management** — Register members with auto-generated IDs, manage status
- **🔄 Borrow & Return** — Issue books to members with configurable loan periods
- **⚠️ Overdue Tracking** — Identify overdue books and calculate fines automatically
- **📊 Dashboard** — Live stats: total books, available, borrowed, overdue
- **🔍 Search & Filter** — Search books by title/author/ISBN, filter by genre; search members by name/email/ID
- **💰 Fine Calculation** — Auto-calculates $1/day overdue fines on return
- **📱 Responsive UI** — Works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js |
| **Database** | SQLite (via `sqlite3`) |
| **Frontend** | HTML5 + CSS3 + Vanilla JS |
| **API** | RESTful JSON API |

---

## 📁 Project Structure

```
library-management-system/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── config/
│   │   └── database.js        # SQLite setup & seed data
│   └── routes/
│       ├── books.js           # Book CRUD endpoints
│       ├── members.js         # Member CRUD endpoints
│       └── transactions.js    # Borrow/return logic
├── frontend/
│   ├── index.html             # Single-page app shell
│   ├── css/
│   │   └── style.css          # Responsive stylesheet
│   └── js/
│       └── app.js             # Frontend logic (no framework)
├── database/                  # SQLite DB created here (gitignored)
├── tests/
│   └── api.test.js            # API integration tests
├── package.json
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v14 or higher
- npm (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Anjalee-29/Library-management-system.git
cd Library-management-system

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Then open your browser at **http://localhost:3000**

> The database is created automatically on first run, and seed data (8 sample books + 4 members) is inserted.

### Development Mode (auto-reload)

```bash
npm run dev
```

---

## 📡 API Reference

### Books

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/books` | List all books (supports `?search=` and `?genre=`) |
| `GET` | `/api/books/:id` | Get a single book |
| `POST` | `/api/books` | Create a new book |
| `PUT` | `/api/books/:id` | Update a book |
| `DELETE` | `/api/books/:id` | Delete a book |
| `GET` | `/api/books/meta/genres` | List all unique genres |

**Create Book (POST /api/books)**
```json
{
  "isbn": "978-0-7432-7356-5",
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "genre": "Fiction",
  "publisher": "Scribner",
  "year": 1925,
  "total_copies": 3,
  "description": "Optional description"
}
```

---

### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/members` | List all members (supports `?search=` and `?status=`) |
| `GET` | `/api/members/:id` | Get member with borrowing history |
| `POST` | `/api/members` | Register a new member |
| `PUT` | `/api/members/:id` | Update member details |
| `DELETE` | `/api/members/:id` | Delete a member |

**Create Member (POST /api/members)**
```json
{
  "name": "Alice Brown",
  "email": "alice@example.com",
  "phone": "555-0101",
  "address": "123 Main St"
}
```

---

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transactions` | List all transactions (supports `?status=borrowed|returned`) |
| `GET` | `/api/transactions/:id` | Get single transaction |
| `POST` | `/api/transactions/borrow` | Borrow a book |
| `PUT` | `/api/transactions/:id/return` | Return a borrowed book |

**Borrow Book (POST /api/transactions/borrow)**
```json
{
  "book_id": 1,
  "member_id": 2,
  "due_days": 14
}
```

---

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Get dashboard statistics |

**Response**
```json
{
  "totalBooks": 8,
  "availableBooks": 6,
  "activeMembers": 4,
  "borrowedBooks": 2,
  "overdueBooks": 0
}
```

---

## 🗄️ Database Schema

```sql
-- Books table
CREATE TABLE books (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  genre           TEXT,
  publisher       TEXT,
  year            INTEGER,
  total_copies    INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  description     TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Members table
CREATE TABLE members (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id   TEXT UNIQUE NOT NULL,   -- auto-generated: LIB-001
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  address     TEXT,
  status      TEXT DEFAULT 'active',
  joined_date DATE DEFAULT CURRENT_DATE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id     INTEGER NOT NULL REFERENCES books(id),
  member_id   INTEGER NOT NULL REFERENCES members(id),
  borrow_date DATE DEFAULT CURRENT_DATE,
  due_date    DATE NOT NULL,
  return_date DATE,
  status      TEXT DEFAULT 'borrowed',  -- borrowed | returned
  fine        REAL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧪 Running Tests

Make sure the server is running first, then:

```bash
npm test
```

The test suite covers:
- Book CRUD (create, read, update, delete)
- Member CRUD
- Borrow and return flow
- Stats endpoint

---

## 🏗️ Business Rules

- A member can borrow **maximum 3 books** at a time
- Default loan period: **14 days** (configurable per transaction)
- Overdue fine: **$1.00 per day**
- Books with active borrowings **cannot be deleted**
- Members with active borrowings **cannot be deleted**
- Member IDs are **auto-generated** (LIB-001, LIB-002, …)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 🙏 Acknowledgements

Built with [Express.js](https://expressjs.com/), [SQLite](https://www.sqlite.org/), and plain HTML/CSS/JS — no frontend framework required.
