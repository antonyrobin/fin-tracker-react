import { openDB } from 'idb';

const DB_NAME = 'MyTransactionsDB';
const DB_VERSION = 2;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Users store (new in v2)
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        userStore.createIndex('email', 'email', { unique: true });
      }

      // Accounts store
      if (!db.objectStoreNames.contains('accounts')) {
        const accountStore = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
        accountStore.createIndex('name', 'name', { unique: false });
        accountStore.createIndex('userId', 'userId');
      } else if (oldVersion < 2) {
        const accountStore = transaction.objectStore('accounts');
        if (!accountStore.indexNames.contains('userId')) {
          accountStore.createIndex('userId', 'userId');
        }
        // Remove unique constraint on name by recreating the index
        if (accountStore.indexNames.contains('name')) {
          accountStore.deleteIndex('name');
          accountStore.createIndex('name', 'name', { unique: false });
        }
      }

      // Transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        txStore.createIndex('accountId', 'accountId');
        txStore.createIndex('type', 'type');
        txStore.createIndex('date', 'date');
        txStore.createIndex('category', 'category');
        txStore.createIndex('userId', 'userId');
      } else if (oldVersion < 2) {
        const txStore = transaction.objectStore('transactions');
        if (!txStore.indexNames.contains('userId')) {
          txStore.createIndex('userId', 'userId');
        }
      }

      // Reminders store
      if (!db.objectStoreNames.contains('reminders')) {
        const reminderStore = db.createObjectStore('reminders', { keyPath: 'id', autoIncrement: true });
        reminderStore.createIndex('dueDate', 'dueDate');
        reminderStore.createIndex('type', 'type');
        reminderStore.createIndex('userId', 'userId');
      } else if (oldVersion < 2) {
        const reminderStore = transaction.objectStore('reminders');
        if (!reminderStore.indexNames.contains('userId')) {
          reminderStore.createIndex('userId', 'userId');
        }
      }
    },
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
  const db = await getDB();
  const hashedPassword = await hashPassword(password);
  try {
    const id = await db.add('users', {
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    });
    return { id, name, email: email.toLowerCase().trim() };
  } catch (err) {
    if (err.name === 'ConstraintError') {
      throw new Error('An account with this email already exists.');
    }
    throw err;
  }
}

export async function loginUser(email, password) {
  const db = await getDB();
  const hashedPassword = await hashPassword(password);
  const tx = db.transaction('users', 'readonly');
  const index = tx.store.index('email');
  const user = await index.get(email.toLowerCase().trim());
  if (!user) {
    throw new Error('No account found with this email.');
  }
  if (user.password !== hashedPassword) {
    throw new Error('Incorrect password.');
  }
  return { id: user.id, name: user.name, email: user.email };
}

export async function getUserById(id) {
  const db = await getDB();
  const user = await db.get('users', id);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email };
}

// ─── Accounts ────────────────────────────────────────────
export async function getAllAccounts(userId) {
  const db = await getDB();
  if (userId) {
    const tx = db.transaction('accounts', 'readonly');
    const index = tx.store.index('userId');
    return index.getAll(userId);
  }
  return db.getAll('accounts');
}

export async function getAccount(id) {
  const db = await getDB();
  return db.get('accounts', id);
}

export async function addAccount(account) {
  const db = await getDB();
  return db.add('accounts', { ...account, createdAt: new Date().toISOString() });
}

export async function updateAccount(account) {
  const db = await getDB();
  return db.put('accounts', account);
}

export async function deleteAccount(id, userId) {
  const db = await getDB();
  // Also delete related transactions
  const tx = db.transaction('transactions', 'readwrite');
  const index = tx.store.index('accountId');
  let cursor = await index.openCursor(id);
  while (cursor) {
    if (!userId || cursor.value.userId === userId) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return db.delete('accounts', id);
}

// ─── Transactions ────────────────────────────────────────
export async function getAllTransactions(userId) {
  const db = await getDB();
  if (userId) {
    const tx = db.transaction('transactions', 'readonly');
    const index = tx.store.index('userId');
    return index.getAll(userId);
  }
  return db.getAll('transactions');
}

export async function getTransaction(id) {
  const db = await getDB();
  return db.get('transactions', id);
}

export async function addTransaction(transaction) {
  const db = await getDB();
  return db.add('transactions', { ...transaction, createdAt: new Date().toISOString() });
}

export async function updateTransaction(transaction) {
  const db = await getDB();
  return db.put('transactions', transaction);
}

export async function deleteTransaction(id) {
  const db = await getDB();
  return db.delete('transactions', id);
}

export async function bulkAddTransactions(transactions) {
  const db = await getDB();
  const tx = db.transaction('transactions', 'readwrite');
  for (const t of transactions) {
    await tx.store.add({ ...t, createdAt: new Date().toISOString() });
  }
  await tx.done;
}

// ─── Reminders ───────────────────────────────────────────
export async function getAllReminders(userId) {
  const db = await getDB();
  if (userId) {
    const tx = db.transaction('reminders', 'readonly');
    const index = tx.store.index('userId');
    return index.getAll(userId);
  }
  return db.getAll('reminders');
}

export async function addReminder(reminder) {
  const db = await getDB();
  return db.add('reminders', { ...reminder, createdAt: new Date().toISOString() });
}

export async function updateReminder(reminder) {
  const db = await getDB();
  return db.put('reminders', reminder);
}

export async function deleteReminder(id) {
  const db = await getDB();
  return db.delete('reminders', id);
}

// ─── Export All Data ─────────────────────────────────────
export async function exportAllData(userId) {
  const accounts = await getAllAccounts(userId);
  const transactions = await getAllTransactions(userId);
  const reminders = await getAllReminders(userId);
  return { accounts, transactions, reminders, exportedAt: new Date().toISOString() };
}
