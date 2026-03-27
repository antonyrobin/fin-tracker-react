import { useState, useEffect } from 'react';
import { getAllReminders, addReminder, updateReminder, deleteReminder, getAllAccounts, addTransaction } from '../db/database';
import { useAuth } from '../context/AuthContext';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterTab, setFilterTab] = useState('all');
  const [form, setForm] = useState({
    title: '', type: 'payment', amount: '', dueDate: '', description: '', accountId: '', recurring: 'none',
  });
  const { user } = useAuth();

  useEffect(() => { loadData(); }, [user]);

  async function loadData() {
    if (!user) return;
    const [rem, acc] = await Promise.all([getAllReminders(user.id), getAllAccounts(user.id)]);
    setReminders(rem.sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    setAccounts(acc);
  }

  function openAdd() {
    setEditing(null);
    setForm({ title: '', type: 'payment', amount: '', dueDate: '', description: '', accountId: '', recurring: 'none' });
    setShowModal(true);
  }

  function openEdit(rem) {
    setEditing(rem);
    setForm({
      title: rem.title, type: rem.type, amount: rem.amount, dueDate: rem.dueDate,
      description: rem.description || '', accountId: rem.accountId || '', recurring: rem.recurring || 'none',
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.amount || !form.dueDate) return;
    try {
      const data = { ...form, amount: Number(form.amount), accountId: form.accountId ? Number(form.accountId) : null, completed: false, userId: user.id };
      if (editing) {
        await updateReminder({ ...editing, ...data, completed: editing.completed });
      } else {
        await addReminder(data);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function toggleComplete(rem) {
    const isNowCompleted = !rem.completed;
    await updateReminder({ ...rem, completed: isNowCompleted });

    if (isNowCompleted && rem.accountId) {
      await addTransaction({
        type: rem.type === 'payment' ? 'expense' : 'income',
        accountId: rem.accountId,
        amount: Number(rem.amount) || 0,
        date: new Date().toISOString().split('T')[0],
        description: `Reminder: ${rem.title}`,
        category: 'Other',
        reference: 'Auto-generated',
        userId: user.id
      });
    }

    loadData();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this reminder?')) return;
    await deleteReminder(id);
    loadData();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function getDaysUntil(dateStr) {
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  }

  function getDueLabel(days) {
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  }

  const filteredReminders = reminders.filter(r => {
    if (filterTab === 'payment') return r.type === 'payment' && !r.completed;
    if (filterTab === 'receivable') return r.type === 'receivable' && !r.completed;
    if (filterTab === 'completed') return r.completed;
    if (filterTab === 'overdue') return getDaysUntil(r.dueDate) < 0 && !r.completed;
    return !r.completed;
  });

  const overdueCount = reminders.filter(r => getDaysUntil(r.dueDate) < 0 && !r.completed).length;

  const getAccountName = (id) => accounts.find(a => a.id === id)?.name || '';
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reminders</h2>
          <p>Upcoming payments and receivables</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="btn-add-reminder">
          <span>+</span> Add Reminder
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button className={`tab-btn ${filterTab === 'all' ? 'active' : ''}`} onClick={() => setFilterTab('all')}>
          Active ({reminders.filter(r => !r.completed).length})
        </button>
        <button className={`tab-btn ${filterTab === 'payment' ? 'active' : ''}`} onClick={() => setFilterTab('payment')}>
          Payments
        </button>
        <button className={`tab-btn ${filterTab === 'receivable' ? 'active' : ''}`} onClick={() => setFilterTab('receivable')}>
          Receivables
        </button>
        {overdueCount > 0 && (
          <button className={`tab-btn ${filterTab === 'overdue' ? 'active' : ''}`} onClick={() => setFilterTab('overdue')}
            style={{ color: 'var(--accent-rose)' }}>
            Overdue ({overdueCount})
          </button>
        )}
        <button className={`tab-btn ${filterTab === 'completed' ? 'active' : ''}`} onClick={() => setFilterTab('completed')}>
          Completed
        </button>
      </div>

      {/* Reminder List */}
      {filteredReminders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No Reminders</h3>
            <p>{reminders.length === 0 ? 'Add a reminder for upcoming payments or receivables.' : 'No reminders in this category.'}</p>
            {reminders.length === 0 && <button className="btn btn-primary mt-lg" onClick={openAdd}>+ Add Reminder</button>}
          </div>
        </div>
      ) : (
        <div className="reminder-list">
          {filteredReminders.map(rem => {
            const days = getDaysUntil(rem.dueDate);
            const isOverdue = days < 0 && !rem.completed;
            return (
              <div key={rem.id} className={`card reminder-card ${rem.type} ${isOverdue ? 'overdue' : ''}`}
                style={{ opacity: rem.completed ? 0.6 : 1 }}>
                <div className="reminder-icon">
                  {rem.type === 'payment' ? '💸' : '💰'}
                </div>
                <div className="reminder-info">
                  <div className="reminder-title" style={{ textDecoration: rem.completed ? 'line-through' : 'none' }}>
                    {rem.title}
                  </div>
                  <div className="reminder-meta">
                    {rem.type === 'payment' ? 'Payment' : 'Receivable'}
                    {getAccountName(rem.accountId) && ` · ${getAccountName(rem.accountId)}`}
                    {rem.recurring !== 'none' && ` · 🔁 ${rem.recurring}`}
                  </div>
                  {rem.description && <div className="reminder-meta">{rem.description}</div>}
                </div>
                <div className="reminder-amount">{fmt(rem.amount)}</div>
                <div className="reminder-due">
                  <div className="due-date">{new Date(rem.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                  <div className="due-label">{rem.completed ? 'Completed' : getDueLabel(days)}</div>
                </div>
                <div className="inline-flex" style={{ gap: '4px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => toggleComplete(rem)} title={rem.completed ? 'Undo' : 'Mark done'}>
                    {rem.completed ? '↩️' : '✅'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(rem)} title="Edit">✏️</button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleDelete(rem.id)} title="Delete"
                    style={{ color: 'var(--accent-rose)' }}>🗑️</button>
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
            <h3>{editing ? 'Edit Reminder' : 'Add Reminder'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="rem-title">Title</label>
                <input id="rem-title" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Rent Payment" required />
              </div>
              <div className="form-group">
                <label htmlFor="rem-type">Type</label>
                <select id="rem-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="payment">Payment (You owe)</option>
                  <option value="receivable">Receivable (You're owed)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="rem-amount">Amount</label>
                <input id="rem-amount" type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label htmlFor="rem-due">Due Date</label>
                <input id="rem-due" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="rem-account">Account (Optional)</label>
                <select id="rem-account" value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}>
                  <option value="">None</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="rem-recurring">Recurring</label>
                <select id="rem-recurring" value={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.value })}>
                  <option value="none">One-time</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="rem-desc">Notes (Optional)</label>
                <input id="rem-desc" type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Additional details" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Reminder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
