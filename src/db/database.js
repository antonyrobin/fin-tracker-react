const API_URL = import.meta.env.VITE_D1_API_URL;
const API_TOKEN = import.meta.env.VITE_D1_API_TOKEN;

async function fetchD1(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });
  const data = await res.json();
  // Handle both standard REST success (res.ok) and explicit {"success": false} schemas
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || 'D1 API Error');
  }
  return data;
}

// Used for complex or chained queries
async function queryD1(sql, params = []) {
  return fetchD1('/query', {
    method: 'POST',
    body: JSON.stringify({ query: sql, params })
  });
}

// ─── Password Hashing (SHA-256) ──────────────────────────
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Users ───────────────────────────────────────────────
export async function registerUser({ name, email, password }) {
  const hashedPassword = await hashPassword(password);
  try {
    const res = await fetchD1('/rest/users', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        createdAt: new Date().toISOString()
      })
    });
    
    // Fallback: If the API doesn't return the ID, fetch it by email
    let id = res.meta?.last_row_id || res.data?.id;
    if (!id) {
      const getRes = await fetchD1(`/rest/users?email=${encodeURIComponent(email.toLowerCase().trim())}`);
      id = getRes.results?.[0]?.id;
    }
    
    return { id, name, email: email.toLowerCase().trim() };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('An account with this email already exists.');
    }
    throw err;
  }
}

export async function loginUser(email, password) {
  const hashedPassword = await hashPassword(password);
  const res = await fetchD1(`/rest/users?email=${encodeURIComponent(email.toLowerCase().trim())}`);
  
  if (!res.results || res.results.length === 0) {
    throw new Error('No account found with this email.');
  }
  
  const user = res.results[0];
  if (user.password !== hashedPassword) {
    throw new Error('Incorrect password.');
  }
  return { id: user.id, name: user.name, email: user.email };
}

export async function getUserById(id) {
  const res = await fetchD1(`/rest/users/${id}`);
  if (!res.results || res.results.length === 0) return null;
  const user = res.results[0];
  return { id: user.id, name: user.name, email: user.email };
}

// ─── Accounts ────────────────────────────────────────────
export async function getAllAccounts(userId) {
  const endpoint = userId ? `/rest/accounts?userId=${userId}` : '/rest/accounts';
  const res = await fetchD1(endpoint);
  return res.results || [];
}

export async function getAccount(id) {
  const res = await fetchD1(`/rest/accounts/${id}`);
  return res.results?.[0] || null;
}

export async function addAccount(account) {
  const res = await fetchD1('/rest/accounts', {
    method: 'POST',
    body: JSON.stringify({ ...account, createdAt: new Date().toISOString() })
  });
  
  let id = res.meta?.last_row_id || res.data?.id;
  if (!id && account.userId) {
    const getRes = await fetchD1(`/rest/accounts?userId=${account.userId}&sort_by=id&order=desc&limit=1`);
    id = getRes.results?.[0]?.id;
  }
  return id;
}

export async function updateAccount(account) {
  const { id, ...data } = account;
  return fetchD1(`/rest/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteAccount(id, userId) {
  await queryD1('DELETE FROM transactions WHERE accountId = ? AND userId = ?;', [Number(id), Number(userId)]);
  return fetchD1(`/rest/accounts/${id}`, { method: 'DELETE' });
}

// ─── Transactions ────────────────────────────────────────
export async function getAllTransactions(userId) {
  const endpoint = userId ? `/rest/transactions?userId=${userId}` : '/rest/transactions';
  const res = await fetchD1(endpoint);
  return res.results || [];
}

export async function getTransaction(id) {
  const res = await fetchD1(`/rest/transactions/${id}`);
  return res.results?.[0] || null;
}

export async function addTransaction(transaction) {
  const res = await fetchD1('/rest/transactions', {
    method: 'POST',
    body: JSON.stringify({ ...transaction, createdAt: new Date().toISOString() })
  });
  
  let id = res.meta?.last_row_id || res.data?.id;
  if (!id && transaction.userId) {
    const getRes = await fetchD1(`/rest/transactions?userId=${transaction.userId}&sort_by=id&order=desc&limit=1`);
    id = getRes.results?.[0]?.id;
  }
  return id;
}

export async function updateTransaction(transaction) {
  const { id, ...data } = transaction;
  return fetchD1(`/rest/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteTransaction(id) {
  return fetchD1(`/rest/transactions/${id}`, { method: 'DELETE' });
}

export async function bulkAddTransactions(transactions) {
  if (transactions.length === 0) return;
  const values = transactions.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const flatParams = transactions.flatMap(t => [
    t.userId || null, t.accountId || null, t.type || null, t.amount || null, 
    t.date || null, t.category || null, t.reference || null, t.description || null, 
    new Date().toISOString()
  ]);
  
  await queryD1(
    `INSERT INTO transactions (userId, accountId, type, amount, date, category, reference, description, createdAt) VALUES ${values};`,
    flatParams
  );
}

// ─── Reminders ───────────────────────────────────────────
function formatReminders(reminders) {
  return reminders.map(r => ({
    ...r,
    completed: r.completed === 1 || r.completed === true || r.completed === 'true'
  }));
}

export async function getAllReminders(userId) {
  const endpoint = userId ? `/rest/reminders?userId=${userId}` : '/rest/reminders';
  const res = await fetchD1(endpoint);
  return formatReminders(res.results || []);
}

export async function addReminder(reminder) {
  const res = await fetchD1('/rest/reminders', {
    method: 'POST',
    body: JSON.stringify({ ...reminder, createdAt: new Date().toISOString() })
  });
  
  let id = res.meta?.last_row_id || res.data?.id;
  if (!id && reminder.userId) {
    const getRes = await fetchD1(`/rest/reminders?userId=${reminder.userId}&sort_by=id&order=desc&limit=1`);
    id = getRes.results?.[0]?.id;
  }
  return id;
}

export async function updateReminder(reminder) {
  const { id, ...data } = reminder;
  return fetchD1(`/rest/reminders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteReminder(id) {
  return fetchD1(`/rest/reminders/${id}`, { method: 'DELETE' });
}

// ─── Export All Data ─────────────────────────────────────
export async function exportAllData(userId) {
  const accounts = await getAllAccounts(userId);
  const transactions = await getAllTransactions(userId);
  const reminders = await getAllReminders(userId);
  return { accounts, transactions, reminders, exportedAt: new Date().toISOString() };
}
