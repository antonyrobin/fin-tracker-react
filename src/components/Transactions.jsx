import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAllTransactions, addTransaction, updateTransaction, deleteTransaction, getAllAccounts } from '../db/database';
import { useAuth } from '../context/AuthContext';

const TYPES = ['income', 'expense', 'transfer', 'credit', 'debit'];
const CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investment',
  'Food', 'Groceries', 'Fuel', 'Shopping', 'Bills', 'Rent', 'Entertainment',
  'Health', 'Education', 'Travel', 'Insurance', 'Loan EMI', 'EMI',
  'Maintenance', 'Donation', 'Subscription', 'Utilities', 'Recharge', 'Taxes',
  'Transfer', 'Other',
];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const getDefaultDates = () => {
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    return {
      start: threeMonthsAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  const [datePreset, setDatePreset] = useState('3-months');
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [form, setForm] = useState({
    type: 'expense', accountId: '', toAccountId: '', amount: '', date: new Date().toISOString().split('T')[0],
    description: '', category: 'Other', reference: '',
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const RECORDS_PER_PAGE = 50;

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const generateIdempotencyKey = () => {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  useEffect(() => { loadData(); }, [user]);

  useEffect(() => {
    if (location.state && accounts.length > 0) {
      const { preSelectAccountId, openAdd } = location.state;
      if (preSelectAccountId) {
        setFilterAccount(String(preSelectAccountId));
        // Reset date filter to All Time when pre-selecting an account
        setDatePreset('all');
        setStartDate('');
        setEndDate('');
        
        if (openAdd) {
          setEditing(null);
          setForm({
            type: 'expense',
            accountId: String(preSelectAccountId),
            toAccountId: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            description: '',
            category: 'Other',
            reference: ''
          });
          setIdempotencyKey(generateIdempotencyKey());
          setShowModal(true);
        }
      }
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, accounts, navigate]);

  async function loadData() {
    if (!transactions.length && !accounts.length) setLoading(true);
    const [txn, acc] = await Promise.all([getAllTransactions(user.id), getAllAccounts(user.id)]);
    setTransactions(txn.sort((a, b) => b.date.localeCompare(a.date)));
    setAccounts(acc);
    setLoading(false);
  }

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else {
      const today = new Date();
      let start = new Date();
      if (preset === '30-days') {
        start.setDate(today.getDate() - 30);
      } else if (preset === '3-months') {
        start.setMonth(today.getMonth() - 3);
      } else if (preset === '6-months') {
        start.setMonth(today.getMonth() - 6);
      } else if (preset === 'this-year') {
        start = new Date(today.getFullYear(), 0, 1);
      }
      
      if (preset !== 'custom') {
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
      }
    }
  };

  const handleStartDateChange = (val) => {
    setStartDate(val);
    setDatePreset('custom');
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    setDatePreset('custom');
  };

  const resetFilters = () => {
    setFilterType('all');
    setFilterAccount('all');
    setFilterCategory('all');
    setSearchText('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date-desc');
    setDatePreset('3-months');
    const defaultDates = getDefaultDates();
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (filterAccount !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (minAmount !== '') count++;
    if (maxAmount !== '') count++;
    if (datePreset !== 'all') count++;
    if (searchText !== '') count++;
    return count;
  }, [filterType, filterAccount, filterCategory, minAmount, maxAmount, datePreset, searchText]);

  const dateRangeLabel = useMemo(() => {
    if (datePreset === 'all') return 'All Time';
    if (!startDate && !endDate) return 'All Time';
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (startDate) {
      return `From ${formatDate(startDate)}`;
    } else {
      return `Until ${formatDate(endDate)}`;
    }
  }, [datePreset, startDate, endDate]);

  const filtered = useMemo(() => {
    const res = transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterAccount !== 'all' && t.accountId !== Number(filterAccount)) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      
      // Date filtering
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      
      // Amount range filtering
      const amt = Number(t.amount) || 0;
      if (minAmount !== '' && amt < Number(minAmount)) return false;
      if (maxAmount !== '' && amt > Number(maxAmount)) return false;
      
      if (searchText && !t.description?.toLowerCase().includes(searchText.toLowerCase()) &&
          !t.category?.toLowerCase().includes(searchText.toLowerCase()) &&
          !t.reference?.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });

    // Apply sorting
    return res.sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount-desc') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      if (sortBy === 'amount-asc') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      return 0;
    });
  }, [transactions, filterType, filterAccount, filterCategory, startDate, endDate, minAmount, maxAmount, searchText, sortBy]);

  const filterTotals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalCredit = 0;
    let totalDebit = 0;
    filtered.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += amt;
      else if (t.type === 'expense') totalExpense += amt;
      else if (t.type === 'credit') totalCredit += amt;
      else if (t.type === 'debit') totalDebit += amt;
    });
    return { totalIncome, totalExpense, totalCredit, totalDebit };
  }, [filtered]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterAccount, filterCategory, startDate, endDate, minAmount, maxAmount, searchText, sortBy]);

  const totalPages = Math.ceil(filtered.length / RECORDS_PER_PAGE);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + RECORDS_PER_PAGE);
  }, [filtered, currentPage]);

  function openAdd() {
    setEditing(null);
    setForm({
      type: 'expense', accountId: accounts[0]?.id || '', toAccountId: '', amount: '',
      date: new Date().toISOString().split('T')[0], description: '', category: 'Other', reference: '',
    });
    setIdempotencyKey(generateIdempotencyKey());
    setShowModal(true);
  }

  function openEdit(txn) {
    setEditing(txn);
    setForm({
      type: txn.type, accountId: txn.accountId, toAccountId: '', amount: txn.amount,
      date: txn.date, description: txn.description || '', category: txn.category || 'Other',
      reference: txn.reference || '',
    });
    setIdempotencyKey(generateIdempotencyKey());
    setShowModal(true);
  }

  function openRepeat(txn) {
    setEditing(null);
    setForm({
      type: txn.type, accountId: txn.accountId, toAccountId: '', amount: txn.amount,
      date: new Date().toISOString().split('T')[0], description: txn.description || '', category: txn.category || 'Other',
      reference: '',
    });
    setIdempotencyKey(generateIdempotencyKey());
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || !form.accountId || isSubmitting) return;
    if (form.type === 'transfer' && !form.toAccountId) {
      alert('Please select a destination account for the transfer.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (form.type === 'transfer') {
        // Handle Self Transfer as two transactions with safe, separate suffix idempotency keys
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
          }, { idempotencyKey: `${idempotencyKey}-out` }),
          addTransaction({
            type: 'income',
            accountId: Number(form.toAccountId),
            amount: Number(form.amount),
            date: form.date,
            description: `Transfer from ${getAccountName(Number(form.accountId))}: ${form.description}`,
            category: 'Transfer',
            reference: form.reference,
            userId: user.id
          }, { idempotencyKey: `${idempotencyKey}-in` })
        ]);
      } else {
        const data = { ...form, amount: Number(form.amount), accountId: Number(form.accountId), userId: user.id };
        delete data.toAccountId; // Clean up
        if (editing) {
          await updateTransaction({ ...editing, ...data }, { idempotencyKey });
        } else {
          await addTransaction(data, { idempotencyKey });
        }
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
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
          <p>
            {loading ? '' : (
              <>
                <strong>{filtered.length}</strong> transaction{filtered.length !== 1 ? 's' : ''} found
                <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--accent-indigo-light)', fontWeight: 600 }}>{dateRangeLabel}</span>
              </>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="btn-add-transaction">
          <span>+</span> Add Transaction
        </button>
      </div>

      {loading ? (
        <div>
          <div className="filter-bar" style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div className="skeleton skeleton-input" style={{ flex: 1, minWidth: 240, height: 38 }}></div>
            <div className="skeleton skeleton-input" style={{ width: 140, height: 38 }}></div>
            <div className="skeleton skeleton-input" style={{ width: 140, height: 38 }}></div>
            <div className="skeleton skeleton-input" style={{ width: 120, height: 38 }}></div>
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

      {/* Filters Container */}
      <div className="filters-container">
        {/* Main Bar */}
        <div className="filter-bar-main">
          <div className="filter-search-wrapper">
            <span className="filter-search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search description, category, reference..." 
              value={searchText}
              onChange={e => setSearchText(e.target.value)} 
              id="search-transactions" 
            />
          </div>

          <div>
            <select 
              value={datePreset} 
              onChange={e => handlePresetChange(e.target.value)} 
              id="filter-date-preset"
            >
              <option value="3-months">Last 3 Months</option>
              <option value="30-days">Last 30 Days</option>
              <option value="6-months">Last 6 Months</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom Range</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)} 
              id="filter-sort-by"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>

          <div className="filter-actions">
            <button 
              className={`btn btn-outline ${showAdvancedFilters ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              id="btn-toggle-advanced-filters"
            >
              ⚙️ More Filters
              {activeFiltersCount > 1 || (activeFiltersCount === 1 && searchText === '') ? (
                <span className="filter-badge-count">
                  {activeFiltersCount - (searchText !== '' ? 1 : 0)}
                </span>
              ) : null}
            </button>
            
            {activeFiltersCount > 1 || (activeFiltersCount === 1 && datePreset !== '3-months') || (activeFiltersCount === 1 && searchText !== '') ? (
              <button 
                className="btn btn-outline" 
                onClick={resetFilters}
                style={{ color: 'var(--accent-rose)', borderColor: 'rgba(225, 29, 72, 0.2)' }}
                id="btn-reset-filters"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>

        {/* Collapsible Panel */}
        <div className={`advanced-filters-panel ${showAdvancedFilters ? 'show' : ''}`}>
          <div className="advanced-filters-grid">
            <div className="filter-field">
              <label htmlFor="filter-tx-type">Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} id="filter-tx-type">
                <option value="all">All Types</option>
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="filter-tx-account">Account</label>
              <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} id="filter-tx-account">
                <option value="all">All Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="filter-tx-category">Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} id="filter-tx-category">
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="filter-field">
              <label>Amount Range</label>
              <div className="filter-range-inputs">
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={minAmount} 
                  onChange={e => setMinAmount(e.target.value)} 
                  id="filter-min-amount"
                />
                <span className="filter-range-separator">to</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={maxAmount} 
                  onChange={e => setMaxAmount(e.target.value)} 
                  id="filter-max-amount"
                />
              </div>
            </div>

            <div className="filter-field">
              <label>Custom Date Range</label>
              <div className="filter-range-inputs">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => handleStartDateChange(e.target.value)} 
                  id="filter-start-date"
                />
                <span className="filter-range-separator">to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => handleEndDateChange(e.target.value)} 
                  id="filter-end-date"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card summary-card card-income">
          <div className="card-icon">📈</div>
          <div className="card-label">Total Income</div>
          <div className="card-value" style={{ color: 'var(--accent-emerald)' }}>{fmt(filterTotals.totalIncome)}</div>
          <div className="card-sub">Including credits: {fmt(filterTotals.totalCredit)}</div>
        </div>

        <div className="card summary-card card-expense">
          <div className="card-icon">📉</div>
          <div className="card-label">Total Expenses</div>
          <div className="card-value" style={{ color: 'var(--accent-rose)' }}>{fmt(filterTotals.totalExpense)}</div>
          <div className="card-sub">Including debits: {fmt(filterTotals.totalDebit)}</div>
        </div>
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
        <>
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
              {paginatedTransactions.map(txn => (
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
                      <button className="btn btn-outline btn-sm" onClick={() => openRepeat(txn)} title="Repeat Payment">🔁</button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(txn)} title="Edit">✏️</button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(txn.id)} title="Delete" style={{ color: 'var(--accent-rose)' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filtered.length > 0 && (
          <div className="pagination-bar flex-between mt-lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * RECORDS_PER_PAGE + 1} to {Math.min(currentPage * RECORDS_PER_PAGE, filtered.length)} of {filtered.length} entries
            </div>
            {totalPages > 1 && (
              <div className="flex" style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                  if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                    return (
                      <button key={pageNum} className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCurrentPage(pageNum)}>
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === 2 && currentPage > 3) {
                    return <span key="ellipsis-start" style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>...</span>;
                  }
                  if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                    return <span key="ellipsis-end" style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>...</span>;
                  }
                  return null;
                })}
                <button className="btn btn-outline btn-sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
        </>
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
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : (editing ? 'Update' : 'Add Transaction')}
                </button>
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
