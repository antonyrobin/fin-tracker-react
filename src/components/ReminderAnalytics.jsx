import { useState, useEffect, useMemo } from 'react';
import { getAllReminders, getAllAccounts } from '../db/database';
import { useAuth } from '../context/AuthContext';

export default function ReminderAnalytics() {
  const [reminders, setReminders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    try {
      const [rem, acc] = await Promise.all([
        getAllReminders(user.id),
        getAllAccounts(user.id)
      ]);
      setReminders(rem);
      setAccounts(acc);
    } catch (err) {
      console.error('Error loading data for analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  function getDaysUntil(dateStr) {
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  }

  const getAccountName = (id) => accounts.find(a => a.id === id)?.name || '—';
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const analytics = useMemo(() => {
    const active = reminders.filter(r => !r.completed);

    // Widget totals
    const next7Payable = active
      .filter(r => r.type === 'payment' && getDaysUntil(r.dueDate) >= 0 && getDaysUntil(r.dueDate) <= 7)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const next7Receivable = active
      .filter(r => r.type === 'receivable' && getDaysUntil(r.dueDate) >= 0 && getDaysUntil(r.dueDate) <= 7)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    // Aging function
    const getAgingData = (type) => {
      const buckets = [
        { label: 'Overdue', count: 0, amount: 0, filter: (days) => days < 0 },
        { label: 'Next 7 Days', count: 0, amount: 0, filter: (days) => days >= 0 && days <= 7 },
        { label: 'Next 15 Days', count: 0, amount: 0, filter: (days) => days > 7 && days <= 15 },
        { label: 'Next 30 Days', count: 0, amount: 0, filter: (days) => days > 15 && days <= 30 },
        { label: 'More than 30 Days', count: 0, amount: 0, filter: (days) => days > 30 },
      ];

      active.filter(r => r.type === type).forEach(r => {
        const days = getDaysUntil(r.dueDate);
        const bucket = buckets.find(b => b.filter(days));
        if (bucket) {
          bucket.count++;
          bucket.amount += Number(r.amount) || 0;
        }
      });

      return buckets;
    };

    const payablesAging = getAgingData('payment');
    const receivablesAging = getAgingData('receivable');

    // Lists for next 7 days
    const payablesNext7List = active
      .filter(r => r.type === 'payment' && getDaysUntil(r.dueDate) >= 0 && getDaysUntil(r.dueDate) <= 7)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const receivablesNext7List = active
      .filter(r => r.type === 'receivable' && getDaysUntil(r.dueDate) >= 0 && getDaysUntil(r.dueDate) <= 7)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // From/To Net Summary
    const fromToMap = {};
    active.forEach(r => {
      let name = (r.fromTo || '').trim();
      if (!name || name === '-' || name === '—') {
        name = '-';
      }
      
      if (!fromToMap[name]) {
        fromToMap[name] = { name, receivable: 0, payable: 0 };
      }
      
      const amt = Number(r.amount) || 0;
      if (r.type === 'receivable') {
        fromToMap[name].receivable += amt;
      } else if (r.type === 'payment') {
        fromToMap[name].payable += amt;
      }
    });

    const fromToSummary = Object.values(fromToMap)
      .map(item => {
        const net = item.receivable - item.payable;
        return {
          ...item,
          net,
          absNet: Math.abs(net),
          status: net > 0 ? 'receivable' : 'payable'
        };
      })
      .filter(item => item.net !== 0)
      .sort((a, b) => b.absNet - a.absNet);

    return {
      next7Payable,
      next7Receivable,
      payablesAging,
      receivablesAging,
      payablesNext7List,
      receivablesNext7List,
      fromToSummary,
    };
  }, [reminders, today]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reminders Analytics</h2>
          <p>Deeper insights into your outstanding payables and receivables</p>
        </div>
      </div>

      {loading ? (
        <div>
          <div className="summary-grid">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card summary-card">
                <div className="skeleton skeleton-icon"></div>
                <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                <div className="skeleton skeleton-text-lg" style={{ width: '80%' }}></div>
              </div>
            ))}
          </div>
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
          {/* Section A - Summary Widgets */}
          <div className="summary-grid analytics-widgets">
            <div className="card summary-card card-expense">
              <div className="card-icon">💸</div>
              <div className="card-label">Payable (Next 7 Days)</div>
              <div className="card-value" style={{ color: 'var(--accent-rose)' }}>
                {fmt(analytics.next7Payable)}
              </div>
              <div className="card-sub">
                {analytics.payablesNext7List.length} reminders due within 7 days
              </div>
            </div>

            <div className="card summary-card card-income">
              <div className="card-icon">💰</div>
              <div className="card-label">Receivable (Next 7 Days)</div>
              <div className="card-value" style={{ color: 'var(--accent-emerald)' }}>
                {fmt(analytics.next7Receivable)}
              </div>
              <div className="card-sub">
                {analytics.receivablesNext7List.length} reminders due within 7 days
              </div>
            </div>
          </div>

          {/* Section B - Aging Analysis */}
          <h3 className="analytics-section-title">Aging Analysis</h3>
          <div className="analytics-tables-grid">
            <div className="card">
              <h4 className="table-title text-rose">💸 Payables Aging Analysis</h4>
              <div className="table-container mt-md">
                <table>
                  <thead>
                    <tr>
                      <th>Time Frame</th>
                      <th>Reminders</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.payablesAging.map((row, idx) => (
                      <tr key={idx} className={row.count > 0 && row.label === 'Overdue' ? 'bg-danger-light' : ''}>
                        <td style={{ fontWeight: 600 }}>{row.label}</td>
                        <td>{row.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: row.amount > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                          {fmt(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h4 className="table-title text-emerald">💰 Receivables Aging Analysis</h4>
              <div className="table-container mt-md">
                <table>
                  <thead>
                    <tr>
                      <th>Time Frame</th>
                      <th>Reminders</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.receivablesAging.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{row.label}</td>
                        <td>{row.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: row.amount > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                          {fmt(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section C - Next 7 Days Lists */}
          <div className="mt-xl">
            <h3 className="analytics-section-title">Upcoming due in next 7 days</h3>
            
            <div className="analytics-tables-grid mt-md">
              {/* Next 7 Days Payables */}
              <div className="card">
                <h4 className="table-title text-rose">💸 Payables (Next 7 Days)</h4>
                {analytics.payablesNext7List.length === 0 ? (
                  <div className="empty-state-sm mt-md">
                    <p>No payables due in the next 7 days.</p>
                  </div>
                ) : (
                  <div className="table-container mt-md">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>To Name</th>
                          <th>Due Date</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.payablesNext7List.map(rem => (
                          <tr key={rem.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rem.title}</td>
                            <td>{rem.fromTo || '—'}</td>
                            <td>{new Date(rem.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-rose)' }}>{fmt(rem.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Next 7 Days Receivables */}
              <div className="card">
                <h4 className="table-title text-emerald">💰 Receivables (Next 7 Days)</h4>
                {analytics.receivablesNext7List.length === 0 ? (
                  <div className="empty-state-sm mt-md">
                    <p>No receivables due in the next 7 days.</p>
                  </div>
                ) : (
                  <div className="table-container mt-md">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>From Name</th>
                          <th>Due Date</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.receivablesNext7List.map(rem => (
                          <tr key={rem.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rem.title}</td>
                            <td>{rem.fromTo || '—'}</td>
                            <td>{new Date(rem.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)' }}>{fmt(rem.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section D - From/To Net Summary */}
          <div className="mt-xl">
            <h3 className="analytics-section-title">From / To Net Summary</h3>
            <div className="card mt-md">
              {analytics.fromToSummary.length === 0 ? (
                <div className="empty-state-sm" style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p>No From/To summary data available.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th style={{ textAlign: 'right' }}>Total Receivable</th>
                        <th style={{ textAlign: 'right' }}>Total Payable</th>
                        <th style={{ textAlign: 'right' }}>Net Balance</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.fromToSummary.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</td>
                          <td style={{ textAlign: 'right', color: row.receivable > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                            {row.receivable > 0 ? fmt(row.receivable) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color: row.payable > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                            {row.payable > 0 ? fmt(row.payable) : '—'}
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            fontWeight: 700, 
                            color: row.net > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' 
                          }}>
                            {row.net > 0 ? '+' : ''}{fmt(row.net)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge badge-${row.status}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
