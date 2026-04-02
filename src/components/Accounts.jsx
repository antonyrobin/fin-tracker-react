import { useState, useEffect } from 'react';
import { getAllAccounts, addAccount, updateAccount, deleteAccount, getAllTransactions } from '../db/database';
import { useAuth } from '../context/AuthContext';

const ACCOUNT_TYPES = ['savings', 'checking', 'credit card', 'cash', 'investment', 'loan', 'other'];
const TYPE_ICONS = {
  savings: '🏦', checking: '💼', 'credit card': '💳', cash: '💵',
  investment: '📈', loan: '🏠', other: '📋',
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'savings', balance: '', description: '' });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => { loadData(); }, [user]);

  async function loadData() {
    if (!accounts.length && !transactions.length) setLoading(true);
    const [acc, txn] = await Promise.all([getAllAccounts(user.id), getAllTransactions(user.id)]);
    setAccounts(acc);
    setTransactions(txn);
    setLoading(false);
  }

  function getAccountBalance(accountId) {
    const account = accounts.find(a => a.id === accountId);
    const initialBalance = Number(account?.balance) || 0;
    let balance = initialBalance;
    transactions.filter(t => t.accountId === accountId).forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income' || t.type === 'credit') balance += amt;
      if (t.type === 'expense' || t.type === 'debit') balance -= amt;
    });
    return balance;
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', type: 'savings', balance: '', description: '' });
    setShowModal(true);
  }

  function openEdit(acc) {
    setEditing(acc);
    setForm({ name: acc.name, type: acc.type, balance: acc.balance, description: acc.description || '' });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      if (editing) {
        await updateAccount({ ...editing, ...form, balance: Number(form.balance) || 0 });
      } else {
        await addAccount({ ...form, balance: Number(form.balance) || 0, userId: user.id });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this account and all its transactions?')) return;
    await deleteAccount(id, user.id);
    loadData();
  }

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Accounts</h2>
          <p>Manage your bank accounts and wallets</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="btn-add-account">
          <span>+</span> Add Account
        </button>
      </div>

      {loading ? (
        <div className="accounts-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card account-card">
              <div className="skeleton skeleton-icon-circle" style={{ width: 48, height: 48 }}></div>
              <div className="skeleton skeleton-text" style={{ width: '60%', marginTop: 12 }}></div>
              <div className="skeleton skeleton-text" style={{ width: '30%', marginTop: 8 }}></div>
              <div className="skeleton skeleton-text-lg" style={{ width: '50%', marginTop: 16 }}></div>
              <div className="skeleton skeleton-text" style={{ width: '70%', marginTop: 8 }}></div>
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🏦</div>
            <h3>No Accounts Yet</h3>
            <p>Add your first account to start tracking transactions.</p>
            <button className="btn btn-primary mt-lg" onClick={openAdd}>+ Add Account</button>
          </div>
        </div>
      ) : (
        <div className="accounts-grid">
          {accounts.map(acc => {
            const currentBalance = getAccountBalance(acc.id);
            const txnCount = transactions.filter(t => t.accountId === acc.id).length;
            return (
              <div key={acc.id} className="card account-card">
                <div className="account-type-icon">
                  {TYPE_ICONS[acc.type] || '📋'}
                </div>
                <div className="account-name">{acc.name}</div>
                <div className="account-type">{acc.type}</div>
                {acc.description && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                    {acc.description}
                  </div>
                )}
                <div className="account-balance">{fmt(currentBalance)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {txnCount} transaction{txnCount !== 1 ? 's' : ''} · Initial: {fmt(Number(acc.balance) || 0)}
                </div>
                <div className="account-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(acc)}>✏️ Edit</button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleDelete(acc.id)} style={{ color: 'var(--accent-rose)' }}>🗑️ Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Edit Account' : 'Add New Account'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="account-name">Account Name</label>
                <input id="account-name" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. HDFC Savings" required />
              </div>
              <div className="form-group">
                <label htmlFor="account-type">Account Type</label>
                <select id="account-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="account-balance">Opening Balance</label>
                <input id="account-balance" type="number" step="0.01" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder="0" />
              </div>
              <div className="form-group">
                <label htmlFor="account-desc">Description (Optional)</label>
                <input id="account-desc" type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Account description" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
