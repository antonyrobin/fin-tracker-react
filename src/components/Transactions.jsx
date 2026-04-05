import { useState, useEffect, useMemo } from 'react';
import { getAllTransactions, addTransaction, updateTransaction, deleteTransaction, getAllAccounts } from '../db/database';
import { useAuth } from '../context/AuthContext';

const TYPES = ['income', 'expense', 'transfer', 'credit', 'debit'];
const CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investment',
  'Food', 'Fuel', 'Shopping', 'Bills', 'Rent', 'Entertainment',
  'Health', 'Education', 'Travel', 'Insurance', 'Loan EMI',
  'Transfer', 'Other',
];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [form, setForm] = useState({
    type: 'expense', accountId: '', toAccountId: '', amount: '', date: new Date().toISOString().split('T')[0],
    description: '', category: 'Other', reference: '',
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => { loadData(); }, [user]);

  async function loadData() {
    if (!transactions.length && !accounts.length) setLoading(true);
    const [txn, acc] = await Promise.all([getAllTransactions(user.id), getAllAccounts(user.id)]);
    setTransactions(txn.sort((a, b) => b.date.localeCompare(a.date)));
    setAccounts(acc);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterAccount !== 'all' && t.accountId !== Number(filterAccount)) return false;
      if (searchText && !t.description?.toLowerCase().includes(searchText.toLowerCase()) &&
          !t.category?.toLowerCase().includes(searchText.toLowerCase()) &&
          !t.reference?.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [transactions, filterType, filterAccount, searchText]);

  function openAdd() {
    setEditing(null);
    setForm({
      type: 'expense', accountId: accounts[0]?.id || '', toAccountId: '', amount: '',
      date: new Date().toISOString().split('T')[0], description: '', category: 'Other', reference: '',
    });
    setShowModal(true);
  }

  function openEdit(txn) {
    setEditing(txn);
    setForm({
      type: txn.type, accountId: txn.accountId, toAccountId: '', amount: txn.amount,
      date: txn.date, description: txn.description || '', category: txn.category || 'Other',
      reference: txn.reference || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || !form.accountId) return;
    if (form.type === 'transfer' && !form.toAccountId) {
      alert('Please select a destination account for the transfer.');
      return;
    }
    try {
      if (form.type === 'transfer') {
        // Handle Self Transfer as two transactions
        await Promise.all([
          addTransaction({
            type: 'expense',
            accountId: Number(form.accountId),
            amount: Number(form.amount),
            date: form.date,
            description: `Transfer to ${getAccountName(Number(form.toAccountId))}: ${form.description}`,
            category: 'Transfer',
            reference: form.reference,
            userId: user.id
          }),
          addTransaction({
            type: 'income',
            accountId: Number(form.toAccountId),
            amount: Number(form.amount),
            date: form.date,
            description: `Transfer from ${getAccountName(Number(form.accountId))}: ${form.description}`,
            category: 'Transfer',
            reference: form.reference,
            userId: user.id
          })
        ]);
      } else {
        const data = { ...form, amount: Number(form.amount), accountId: Number(form.accountId), userId: user.id };
        delete data.toAccountId; // Clean up
        if (editing) {
          await updateTransaction({ ...editing, ...data });
        } else {
          await addTransaction(data);
        }
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return;
    await deleteTransaction(id);
    loadData();
  }

  const getAccountName = (id) => accounts.find(a => a.id === id)?.name || 'Unknown';
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Transactions</h2>
          <p>{loading ? '' : `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''} found`}</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="btn-add-transaction">
          <span>+</span> Add Transaction
        </button>
      </div>

      {loading ? (
        <div>
          <div className="filter-bar">
            <div className="skeleton skeleton-input"></div>
            <div className="skeleton skeleton-input"></div>
            <div className="skeleton skeleton-input" style={{ flex: 1 }}></div>
          </div>
          <div className="card">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton skeleton-text" style={{ width: '15%' }}></div>
                <div className="skeleton skeleton-badge"></div>
                <div className="skeleton skeleton-text" style={{ width: '25%' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '12%' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '15%' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '10%' }}></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div>

      {/* Filters */}
      <div className="filter-bar">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} id="filter-tx-type">
          <option value="all">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} id="filter-tx-account">
          <option value="all">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="text" placeholder="🔍 Search description, category..." value={searchText}
          onChange={e => setSearchText(e.target.value)} id="search-transactions" style={{ minWidth: 240 }} />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <h3>No Transactions</h3>
            <p>{transactions.length === 0 ? 'Add your first transaction to get started.' : 'No transactions match the current filters.'}</p>
            {transactions.length === 0 && (
              <button className="btn btn-primary mt-lg" onClick={openAdd}>+ Add Transaction</button>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Category</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(txn => (
                <tr key={txn.id}>
                  <td data-label="Date">{new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td data-label="Type"><span className={`badge badge-${txn.type}`}>{txn.type}</span></td>
                  <td data-label="Description" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {txn.description || '—'}
                    {txn.reference && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ref: {txn.reference}</div>}
                  </td>
                  <td data-label="Category">{txn.category || '—'}</td>
                  <td data-label="Account">{getAccountName(txn.accountId)}</td>
                  <td data-label="Amount" style={{ fontWeight: 700, color: txn.type === 'income' || txn.type === 'credit' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {txn.type === 'income' || txn.type === 'credit' ? '+' : '-'}{fmt(txn.amount)}
                  </td>
                  <td data-label="Actions">
                    <div className="inline-flex">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(txn)} title="Edit">✏️</button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(txn.id)} title="Delete" style={{ color: 'var(--accent-rose)' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Edit Transaction' : 'Add Transaction'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="tx-type">Type</label>
                <select id="tx-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="tx-account">{form.type === 'transfer' ? 'From Account' : 'Account'}</label>
                <select id="tx-account" value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} required>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {form.type === 'transfer' && (
                <div className="form-group">
                  <label htmlFor="tx-to-account">To Account</label>
                  <select id="tx-to-account" value={form.toAccountId} onChange={e => setForm({ ...form, toAccountId: e.target.value })} required>
                    <option value="">Select destination</option>
                    {accounts.filter(a => a.id !== Number(form.accountId)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="tx-amount">Amount</label>
                <input id="tx-amount" type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label htmlFor="tx-date">Date</label>
                <input id="tx-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="tx-category">Category</label>
                <select id="tx-category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="tx-desc">Description</label>
                <input id="tx-desc" type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" />
              </div>
              <div className="form-group">
                <label htmlFor="tx-ref">Reference / Txn ID (Optional)</label>
                <input id="tx-ref" type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="e.g. UPI123456" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
