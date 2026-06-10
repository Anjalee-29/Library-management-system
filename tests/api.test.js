/**
 * Basic API tests for Library Management System
 * Run with: node tests/api.test.js
 * Make sure server is running on port 3000 first.
 */

const BASE = 'http://localhost:3000/api';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function assert(condition, msg) {
  if (!condition) { console.error(`  ❌ FAIL: ${msg}`); return false; }
  console.log(`  ✅ PASS: ${msg}`);
  return true;
}

async function runTests() {
  console.log('\n📚 Library Management System - API Tests\n' + '='.repeat(45));

  // --- Books ---
  console.log('\n📖 Books API');
  let r = await req('GET', '/books');
  assert(r.status === 200 && Array.isArray(r.data), 'GET /books returns array');

  r = await req('POST', '/books', { isbn: '999-TEST-001', title: 'Test Book', author: 'Test Author', genre: 'Test', total_copies: 2 });
  assert(r.status === 201, 'POST /books creates book');
  const bookId = r.data.id;

  r = await req('GET', `/books/${bookId}`);
  assert(r.status === 200 && r.data.title === 'Test Book', 'GET /books/:id returns book');

  r = await req('PUT', `/books/${bookId}`, { title: 'Updated Test Book' });
  assert(r.status === 200 && r.data.title === 'Updated Test Book', 'PUT /books/:id updates book');

  // --- Members ---
  console.log('\n👥 Members API');
  r = await req('GET', '/members');
  assert(r.status === 200 && Array.isArray(r.data), 'GET /members returns array');

  r = await req('POST', '/members', { name: 'Test User', email: 'testuser_unique@test.com', phone: '555-9999' });
  assert(r.status === 201, 'POST /members creates member');
  const memberId = r.data.id;

  r = await req('GET', `/members/${memberId}`);
  assert(r.status === 200 && r.data.name === 'Test User', 'GET /members/:id returns member');

  // --- Transactions ---
  console.log('\n🔄 Transactions API');
  r = await req('POST', '/transactions/borrow', { book_id: bookId, member_id: memberId, due_days: 7 });
  assert(r.status === 201, 'POST /transactions/borrow creates borrow');
  const txnId = r.data.id;

  r = await req('GET', '/transactions?status=borrowed');
  assert(r.status === 200 && Array.isArray(r.data), 'GET /transactions filters by status');

  r = await req('PUT', `/transactions/${txnId}/return`);
  assert(r.status === 200, 'PUT /transactions/:id/return returns book');

  // --- Stats ---
  console.log('\n📊 Stats API');
  r = await req('GET', '/stats');
  assert(r.status === 200 && typeof r.data.totalBooks === 'number', 'GET /stats returns stats object');

  // Cleanup
  await req('DELETE', `/books/${bookId}`);
  await req('DELETE', `/members/${memberId}`);

  console.log('\n' + '='.repeat(45));
  console.log('✨ Tests complete!\n');
}

runTests().catch(e => { console.error('Test error:', e.message); process.exit(1); });
