import { useState, useEffect, useMemo } from 'react';
import { getAllAccounts, getAllTransactions, getAllReminders } from '../db/database';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#fb923c', '#818cf8'];

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [filterAccount, setFilterAccount] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!transactions.length && !accounts.length) setLoading(true);
    const [acc, txn, rem] = await Promise.all([
      getAllAccounts(user.id), getAllTransactions(user.id), getAllReminders(user.id),
    ]);
    setAccounts(acc);
    setTransactions(txn);
    setReminders(rem);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterAccount !== 'all' && t.accountId !== Number(filterAccount)) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [transactions, filterAccount, dateFrom, dateTo]);

  const summary = useMemo(() => {
    let totalIncome = 0, totalExpense = 0, totalCredit = 0, totalDebit = 0;
    filtered.forEach(t => {
      const amt = Number(t.amount) || 0;
      switch (t.type) {
        case 'income': totalIncome += amt; break;
        case 'expense': totalExpense += amt; break;
        case 'credit': totalCredit += amt; break;
        case 'debit': totalDebit += amt; break;
      }
    });
    let openingBalance = 0;
    accounts.forEach(a => {
      if (filterAccount === 'all' || a.id === Number(filterAccount)) {
        openingBalance += Number(a.balance) || 0;
      }
    });

    const balance = openingBalance + totalIncome + totalCredit - totalExpense - totalDebit;
    const ratio = totalExpense > 0 ? (totalIncome / totalExpense) : totalIncome > 0 ? Infinity : 0;

    // Pending from reminders
    const today = new Date().toISOString().split('T')[0];
    const pendingPayments = reminders
      .filter(r => r.type === 'payment' && !r.completed)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const pendingReceivables = reminders
      .filter(r => r.type === 'receivable' && !r.completed)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return { totalIncome, totalExpense, totalCredit, totalDebit, balance, ratio, pendingPayments, pendingReceivables };
  }, [filtered, reminders, accounts, filterAccount]);

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const month = t.date ? t.date.substring(0, 7) : 'Unknown';
      if (!map[month]) map[month] = { month, income: 0, expense: 0 };
      if (t.type === 'income' || t.type === 'credit') map[month].income += Number(t.amount) || 0;
      if (t.type === 'expense' || t.type === 'debit') map[month].expense += Number(t.amount) || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  // Category breakdown (expenses)
  const categoryData = useMemo(() => {
    const map = {};
    filtered.filter(t => t.type === 'expense' || t.type === 'debit').forEach(t => {
      const cat = t.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Type breakdown for pie
  const typeData = useMemo(() => {
    return [
      { name: 'Income', value: summary.totalIncome, color: '#34d399' },
      { name: 'Expense', value: summary.totalExpense, color: '#fb7185' },
      { name: 'Credit', value: summary.totalCredit, color: '#22d3ee' },
      { name: 'Debit', value: summary.totalDebit, color: '#fbbf24' },
    ].filter(d => d.value > 0);
  }, [summary]);

  const fmt = (n) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  const incomePercent = summary.totalIncome + summary.totalExpense > 0
    ? (summary.totalIncome / (summary.totalIncome + summary.totalExpense)) * 100
    : 50;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of your financial health</p>
        </div>
      </div>

      {loading ? (
        <div>
          {/* Skeleton for summary cards */}
          <div className="summary-grid">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card summary-card">
                <div className="skeleton skeleton-icon"></div>
                <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                <div className="skeleton skeleton-text-lg" style={{ width: '80%' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
              </div>
            ))}
          </div>
          {/* Skeleton for charts */}
          <div className="charts-grid">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card chart-card">
                <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
                <div className="skeleton skeleton-chart"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div>
      {/* Filters */}
      <div className="filter-bar">
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} id="filter-account">
          <option value="all">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} id="filter-date-from" />
        <span style={{ color: 'var(--text-muted)' }}>to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} id="filter-date-to" />
        {(filterAccount !== 'all' || dateFrom || dateTo) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setFilterAccount('all'); setDateFrom(''); setDateTo(''); }}>
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="card summary-card card-balance">
          <div className="card-icon">💰</div>
          <div className="card-label">Net Balance</div>
          <div className="card-value">{fmt(summary.balance)}</div>
          <div className="card-sub">{filtered.length} transactions</div>
        </div>

        <div className="card summary-card card-income">
          <div className="card-icon">📈</div>
          <div className="card-label">Total Income</div>
          <div className="card-value" style={{ color: 'var(--accent-emerald)' }}>{fmt(summary.totalIncome)}</div>
          <div className="card-sub">Including credits: {fmt(summary.totalCredit)}</div>
        </div>

        <div className="card summary-card card-expense">
          <div className="card-icon">📉</div>
          <div className="card-label">Total Expenses</div>
          <div className="card-value" style={{ color: 'var(--accent-rose)' }}>{fmt(summary.totalExpense)}</div>
          <div className="card-sub">Including debits: {fmt(summary.totalDebit)}</div>
        </div>

        <div className="card summary-card card-pending">
          <div className="card-icon">⏳</div>
          <div className="card-label">Pending Payments</div>
          <div className="card-value" style={{ color: 'var(--accent-amber)' }}>{fmt(summary.pendingPayments)}</div>
          <div className="card-sub">Due upcoming</div>
        </div>

        <div className="card summary-card card-receivable">
          <div className="card-icon">🔄</div>
          <div className="card-label">Pending Receivables</div>
          <div className="card-value" style={{ color: 'var(--accent-cyan)' }}>{fmt(summary.pendingReceivables)}</div>
          <div className="card-sub">Expected incoming</div>
        </div>
      </div>

      {/* Income/Expense Ratio */}
      <div className="card mb-lg" style={{ padding: 'var(--space-lg)' }}>
        <div className="flex-between">
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Income / Expense Ratio</span>
          </div>
          <div>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: summary.ratio >= 1 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
              {summary.ratio === Infinity ? '∞' : summary.ratio.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="ratio-bar">
          <div className="income-bar" style={{ width: `${incomePercent}%` }}></div>
          <div className="expense-bar" style={{ width: `${100 - incomePercent}%` }}></div>
        </div>
        <div className="flex-between mt-md" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Income: {fmt(summary.totalIncome)}</span>
          <span>Expense: {fmt(summary.totalExpense)}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Monthly Trend</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,132,199,0.1)" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid rgba(2,132,199,0.2)', borderRadius: 8, color: '#0f172a' }}
                />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#059669" strokeWidth={3} name="Income" />
                <Line type="monotone" dataKey="expense" stroke="#e11d48" strokeWidth={3} name="Expense" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No data for the selected filters</p>
            </div>
          )}
        </div>

        <div className="card chart-card">
          <h3>Transaction Breakdown</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid rgba(2,132,199,0.2)', borderRadius: 8, color: '#0f172a' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🥧</div>
              <p>No data for the selected filters</p>
            </div>
          )}
        </div>

        {categoryData.length > 0 && (
          <div className="card chart-card">
            <h3>Expense by Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,132,199,0.1)" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={120} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid rgba(2,132,199,0.2)', borderRadius: 8, color: '#0f172a' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Amount">
                  {categoryData.map((_, index) => (
                    <Cell key={`cat-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}
