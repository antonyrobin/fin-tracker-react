import { useState, useEffect, useMemo } from 'react';
import { getAllTransactions, getAllReminders } from '../db/database';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import {
  getMonthlyAverages,
  getUpcomingReminders,
  getExpectedCashflow,
  getCategoryForecast,
  getPredictedVsActual
} from '../utils/predictions';

export default function Predictions() {
  const [transactions, setTransactions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('expense'); // 'expense' or 'income'
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    try {
      const [txns, rems] = await Promise.all([
        getAllTransactions(user.id),
        getAllReminders(user.id)
      ]);
      setTransactions(txns);
      setReminders(rems);
    } catch (err) {
      console.error('Error loading prediction data:', err);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);

  // 1. Calculations
  const data = useMemo(() => {
    if (loading) return null;

    // Monthly averages (3 months)
    const monthlyAverages = getMonthlyAverages(transactions, 3);

    // Next 7 days reminders and projected cashflow
    const next7DaysReminders = getUpcomingReminders(reminders, 7);

    // Next 30 days cashflow breakdown
    const next30DaysCashflow = getExpectedCashflow(transactions, reminders, 30);

    // Category Forecast (compares actual spend of current month against averages)
    const categoryForecast = getCategoryForecast(transactions, monthlyAverages);

    // Predicted vs Actual trend data (6 months)
    const trendData = getPredictedVsActual(transactions, 6);

    // Determine confidence level
    let confidenceLevel = 'Low';
    let confidenceColor = 'var(--accent-rose)';
    let confidenceDesc = 'Very limited history. Add more transactions for better forecasts.';
    let confidenceScore = 20;

    if (monthlyAverages.dataMonthsCount >= 3) {
      confidenceLevel = 'High';
      confidenceColor = 'var(--accent-emerald)';
      confidenceDesc = `Based on robust ${monthlyAverages.dataMonthsCount} months of historical spending and recurring patterns.`;
      confidenceScore = 90;
    } else if (monthlyAverages.dataMonthsCount >= 1) {
      confidenceLevel = 'Medium';
      confidenceColor = 'var(--accent-amber)';
      confidenceDesc = `Based on ${monthlyAverages.dataMonthsCount} month(s) of history. Predictions will improve with more data.`;
      confidenceScore = 55;
    }

    return {
      monthlyAverages,
      next7DaysReminders,
      next30DaysCashflow,
      categoryForecast,
      trendData,
      confidence: {
        level: confidenceLevel,
        color: confidenceColor,
        description: confidenceDesc,
        score: confidenceScore
      }
    };
  }, [transactions, reminders, loading]);

  // Group next 7 days reminders by projected date for a timeline view
  const timelineGrouped = useMemo(() => {
    if (!data || !data.next7DaysReminders) return [];
    
    const groups = {};
    data.next7DaysReminders.forEach(r => {
      const date = r.projectedDate;
      if (!groups[date]) {
        groups[date] = { date, items: [], netFlow: 0 };
      }
      groups[date].items.push(r);
      const amt = Number(r.amount) || 0;
      if (r.type === 'receivable') {
        groups[date].netFlow += amt;
      } else {
        groups[date].netFlow -= amt;
      }
    });

    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  // Filter category forecast data to top 5 categories for clean visualization
  const categoryChartData = useMemo(() => {
    if (!data || !data.categoryForecast) return [];
    return data.categoryForecast
      .slice(0, 5)
      .map(c => ({
        category: c.category,
        Average: Number(c.average.toFixed(2)),
        Projected: Number(c.projectedThisMonth.toFixed(2))
      }));
  }, [data]);

  if (loading) {
    return (
      <div className="predictions-page">
        <div className="page-header">
          <div>
            <h2>🔮 Predictions & Forecasts</h2>
            <p>Analyzing history and schedules to project your financial path</p>
          </div>
        </div>

        <div className="summary-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card summary-card">
              <div className="skeleton skeleton-icon"></div>
              <div className="skeleton skeleton-text" style={{ width: '50%' }}></div>
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
    );
  }

  // Graceful empty states if no data exists
  const hasHistory = transactions.length > 0;

  return (
    <div className="predictions-page">
      <div className="page-header">
        <div>
          <h2>🔮 Predictions & Forecasts</h2>
          <p>Analyzing history and schedules to project your financial path</p>
        </div>
        <button className="btn btn-outline" onClick={loadData}>🔄 Refresh Data</button>
      </div>

      {!hasHistory ? (
        <div className="card text-center" style={{ padding: 'var(--space-2xl) var(--space-xl)' }}>
          <span style={{ fontSize: '3rem' }}>🔮</span>
          <h3 className="mt-md">Insufficient Data for Predictions</h3>
          <p className="text-secondary mt-sm" style={{ maxWidth: '500px', margin: 'var(--space-sm) auto' }}>
            We need at least some historical transaction data to start predicting your future cash flows and expenses. Please record some transactions or import data to get started.
          </p>
        </div>
      ) : (
        <div>
          {/* Section A - Summary Forecast Cards */}
          <div className="summary-grid">
            {/* Expected Income */}
            <div className="card summary-card card-income">
              <div className="card-icon">📈</div>
              <div className="card-label">Expected Income (Next 30 Days)</div>
              <div className="card-value" style={{ color: 'var(--accent-emerald)' }}>
                {fmt(data.next30DaysCashflow.expectedIncome)}
              </div>
              <div className="card-sub">
                Reminders: {fmt(data.next30DaysCashflow.projectedRemindersIncome)} <br />
                Avg Income: {fmt(data.next30DaysCashflow.avgIncomeContribution)}
              </div>
            </div>

            {/* Expected Expenses */}
            <div className="card summary-card card-expense">
              <div className="card-icon">📉</div>
              <div className="card-label">Expected Expenses (Next 30 Days)</div>
              <div className="card-value" style={{ color: 'var(--accent-rose)' }}>
                {fmt(data.next30DaysCashflow.expectedExpense)}
              </div>
              <div className="card-sub">
                Reminders: {fmt(data.next30DaysCashflow.projectedRemindersExpense)} <br />
                Avg Spend: {fmt(data.next30DaysCashflow.avgExpenseContribution)}
              </div>
            </div>

            {/* Net Cashflow */}
            {(() => {
              const net = data.next30DaysCashflow.expectedIncome - data.next30DaysCashflow.expectedExpense;
              const isPositive = net >= 0;
              return (
                <div className={`card summary-card ${isPositive ? 'card-receivable' : 'card-expense'}`}>
                  <div className="card-icon">{isPositive ? '💵' : '💸'}</div>
                  <div className="card-label">Projected Net Cashflow</div>
                  <div className="card-value" style={{ color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {fmt(net)}
                  </div>
                  <div className="card-sub">
                    {isPositive ? 'Surplus expected this period' : 'Deficit projected this period'}
                  </div>
                </div>
              );
            })()}

            {/* Confidence Score Card */}
            <div className="card summary-card card-pending">
              <div className="card-icon">🛡️</div>
              <div className="card-label">Forecast Confidence</div>
              <div className="card-value" style={{ color: data.confidence.color }}>
                {data.confidence.level}
              </div>
              <div className="card-sub">
                {data.confidence.description}
                <div className="confidence-meter-bg mt-sm">
                  <div 
                    className="confidence-meter-fill" 
                    style={{ 
                      width: `${data.confidence.score}%`, 
                      backgroundColor: data.confidence.color 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="predictions-grid">
            {/* Section B - Next 7 Days Timeline */}
            <div className="card timeline-card">
              <h3 className="section-title">📅 Next 7 Days Cashflow Timeline</h3>
              {timelineGrouped.length === 0 ? (
                <div className="empty-state-sm mt-md">
                  <p>No transactions or payments expected in the next 7 days.</p>
                </div>
              ) : (
                <div className="prediction-timeline mt-md">
                  {timelineGrouped.map(group => {
                    const groupDateObj = new Date(group.date);
                    const formattedDate = groupDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
                    const isNetPositive = group.netFlow >= 0;
                    
                    return (
                      <div key={group.date} className="timeline-item">
                        <div className="timeline-connector"></div>
                        <div className="timeline-header">
                          <span className="timeline-date">{formattedDate}</span>
                          <span className={`timeline-net ${isNetPositive ? 'text-emerald' : 'text-rose'}`}>
                            {isNetPositive ? '+' : ''}{fmt(group.netFlow)}
                          </span>
                        </div>
                        <div className="timeline-content mt-xs">
                          {group.items.map(item => (
                            <div key={item.uniqueKey} className={`prediction-item-card ${item.type === 'receivable' ? 'border-receivable' : 'border-payment'}`}>
                              <div className="item-main">
                                <span className="item-title">{item.title}</span>
                                {item.fromTo && <span className="item-from-to">({item.fromTo})</span>}
                                {item.isProjected && <span className="badge-projected">Projected Occurrence</span>}
                                {item.isOverdue && <span className="badge-overdue">Overdue</span>}
                              </div>
                              <div className="item-details text-muted mt-xxs">
                                <span>📂 {item.category || 'Other'}</span>
                                {item.recurring && item.recurring !== 'none' && (
                                  <span className="badge-recurring">🔁 {item.recurring}</span>
                                )}
                              </div>
                              <span className={`item-amount ${item.type === 'receivable' ? 'text-emerald' : 'text-rose'}`}>
                                {item.type === 'receivable' ? '+' : '-'}{fmt(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section C - Category Spend Forecast */}
            <div className="card category-forecast-card">
              <h3 className="section-title">🏷️ Next 30 Days Category Forecast</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
                Compares your expected spending this month (actual MTD projected to full month) vs. your 3-month rolling average.
              </p>
              
              {data.categoryForecast.length === 0 ? (
                <div className="empty-state-sm">
                  <p>No historical expenses available to construct forecast.</p>
                </div>
              ) : (
                <div className="category-forecast-layout">
                  {/* Category Chart */}
                  <div className="category-forecast-chart">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={categoryChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis type="number" stroke="var(--text-muted)" />
                        <YAxis dataKey="category" type="category" width={80} stroke="var(--text-muted)" />
                        <Tooltip 
                          formatter={(value) => fmt(value)}
                          contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        />
                        <Legend />
                        <Bar dataKey="Average" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Projected" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Table */}
                  <div className="table-container mt-md">
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Monthly Avg</th>
                          <th>Projected/MTD</th>
                          <th style={{ textAlign: 'center' }}>Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.categoryForecast.slice(0, 6).map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.category}</td>
                            <td>{fmt(item.average)}</td>
                            <td>
                              <span style={{ fontWeight: 500 }}>{fmt(item.projectedThisMonth)}</span>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                Actual MTD: {fmt(item.actualThisMonth)}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.trend === 'up' && (
                                <span className="trend-badge trend-up">↑ Spending More</span>
                              )}
                              {item.trend === 'down' && (
                                <span className="trend-badge trend-down">↓ Spending Less</span>
                              )}
                              {item.trend === 'stable' && (
                                <span className="trend-badge trend-stable">→ Stable</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section D - Predicted vs Actual Trend Chart */}
          <div className="card mt-xl chart-card">
            <div className="chart-header">
              <h3 className="section-title">🔮 Prediction Accuracy: 6-Month Trend</h3>
              <div className="chart-controls">
                <button 
                  className={`btn-toggle ${chartType === 'expense' ? 'active' : ''}`}
                  onClick={() => setChartType('expense')}
                >
                  📉 Expenses
                </button>
                <button 
                  className={`btn-toggle ${chartType === 'income' ? 'active' : ''}`}
                  onClick={() => setChartType('income')}
                >
                  📈 Income
                </button>
              </div>
            </div>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
              Compares actual monthly totals to what the prior 3-month rolling average predicted at that point in time.
            </p>
            
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.trendData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip 
                    formatter={(value) => fmt(value)}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    name={chartType === 'expense' ? 'Actual Expenses' : 'Actual Income'}
                    dataKey={chartType === 'expense' ? 'actualExpense' : 'actualIncome'}
                    stroke={chartType === 'expense' ? 'var(--accent-rose)' : 'var(--accent-emerald)'}
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    name={chartType === 'expense' ? 'Predicted Expenses (Rolling Avg)' : 'Predicted Income (Rolling Avg)'}
                    dataKey={chartType === 'expense' ? 'predictedExpense' : 'predictedIncome'}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
