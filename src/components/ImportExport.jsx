import { useState, useRef, useEffect } from 'react';
import { getAllAccounts, getAllTransactions, getAllReminders, bulkAddTransactions, exportAllData } from '../db/database';
import { useAuth } from '../context/AuthContext';

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState('import');
  const [accounts, setAccountsList] = useState([]);
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({ date: '', amount: '', description: '', type: '', category: '', reference: '' });
  const [importAccount, setImportAccount] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const { user } = useAuth();

  useEffect(() => {
    if (user) getAllAccounts(user.id).then(setAccountsList);
  }, [user]);

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { vals.push(current.trim()); current = ''; }
        else { current += char; }
      }
      vals.push(current.trim());
      return vals;
    });
    return { headers, rows };
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
      setCsvData(text);

      // Auto-map common headers
      const autoMap = { date: '', amount: '', description: '', type: '', category: '', reference: '' };
      headers.forEach((h, i) => {
        const lower = h.toLowerCase();
        if (lower.includes('date') || lower.includes('time')) autoMap.date = String(i);
        if (lower.includes('amount') || lower.includes('debit') || lower.includes('credit') || lower.includes('value')) autoMap.amount = String(i);
        if (lower.includes('desc') || lower.includes('particular') || lower.includes('narration') || lower.includes('remark')) autoMap.description = String(i);
        if (lower.includes('type') || lower.includes('transaction type')) autoMap.type = String(i);
        if (lower.includes('category') || lower.includes('categ')) autoMap.category = String(i);
        if (lower.includes('ref') || lower.includes('txn') || lower.includes('utr') || lower.includes('transaction id')) autoMap.reference = String(i);
      });
      setMapping(autoMap);
      setImportStatus('');
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (!importAccount) { alert('Please select an account'); return; }
    if (!mapping.date || !mapping.amount) { alert('Please map at least Date and Amount columns'); return; }

    setImportStatus('importing');
    try {
      const transactions = [];
      for (const row of csvRows) {
        const dateVal = row[Number(mapping.date)] || '';
        const amountVal = row[Number(mapping.amount)] || '';
        const desc = mapping.description ? (row[Number(mapping.description)] || '') : '';
        const typeVal = mapping.type ? (row[Number(mapping.type)] || '').toLowerCase() : '';
        const cat = mapping.category ? (row[Number(mapping.category)] || '') : 'Other';
        const ref = mapping.reference ? (row[Number(mapping.reference)] || '') : '';

        const amount = Math.abs(parseFloat(amountVal.replace(/[^0-9.-]/g, '')));
        if (isNaN(amount) || amount === 0) continue;

        // Parse date
        let date;
        try {
          const d = new Date(dateVal);
          if (isNaN(d.getTime())) continue;
          date = d.toISOString().split('T')[0];
        } catch { continue; }

        // Determine type
        let type = 'expense';
        if (typeVal.includes('credit') || typeVal.includes('income') || typeVal.includes('cr')) {
          type = 'income';
        } else if (typeVal.includes('debit') || typeVal.includes('expense') || typeVal.includes('dr')) {
          type = 'expense';
        } else if (parseFloat(amountVal.replace(/[^0-9.-]/g, '')) > 0 && amountVal.includes('-') === false) {
          type = 'income';
        }

        transactions.push({
          type, accountId: Number(importAccount), amount, date,
          description: desc, category: cat || 'Other', reference: ref, userId: user.id
        });
      }

      if (transactions.length === 0) {
        setImportStatus('No valid transactions found in the CSV.');
        return;
      }

      await bulkAddTransactions(transactions);
      setImportStatus(`✅ Successfully imported ${transactions.length} transactions!`);
      setCsvData(null);
      setCsvHeaders([]);
      setCsvRows([]);
    } catch (err) {
      setImportStatus(`❌ Error: ${err.message}`);
    }
  }

  async function handleExportJSON() {
    const data = await exportAllData(user.id);
    downloadFile(JSON.stringify(data, null, 2), 'fintracker-export.json', 'application/json');
  }

  async function handleExportCSV() {
    const transactions = await getAllTransactions(user.id);
    const accounts = await getAllAccounts(user.id);
    const getAccName = (id) => accounts.find(a => a.id === id)?.name || '';

    const headers = ['Date', 'Type', 'Amount', 'Description', 'Category', 'Account', 'Reference'];
    const rows = transactions.map(t => [
      t.date, t.type, t.amount, `"${(t.description || '').replace(/"/g, '""')}"`,
      t.category || '', `"${getAccName(t.accountId)}"`, t.reference || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, 'fintracker-transactions.csv', 'text/csv');
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Import & Export</h2>
          <p>Import bank statements or export your data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>
          📥 Import
        </button>
        <button className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>
          📤 Export
        </button>
      </div>

      {activeTab === 'import' && (
        <div>
          {/* File Upload */}
          {!csvData && (
            <div className={`import-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}>
              <div className="import-icon">📄</div>
              <p>Click or drag & drop a CSV file here</p>
              <p className="import-hint">Supported formats: CSV bank statements</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={e => handleFile(e.target.files[0])} id="csv-file-input" />
            </div>
          )}

          {/* Column Mapping */}
          {csvHeaders.length > 0 && (
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Map CSV Columns
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
                Found {csvRows.length} rows. Map the required columns below.
              </p>

              <div className="form-group">
                <label htmlFor="import-account">Import to Account</label>
                <select id="import-account" value={importAccount} onChange={e => setImportAccount(e.target.value)} required>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                {[
                  { key: 'date', label: 'Date Column *', },
                  { key: 'amount', label: 'Amount Column *', },
                  { key: 'description', label: 'Description Column', },
                  { key: 'type', label: 'Type Column (Cr/Dr)', },
                  { key: 'category', label: 'Category Column', },
                  { key: 'reference', label: 'Reference Column', },
                ].map(({ key, label }) => (
                  <div key={key} className="form-group">
                    <label>{label}</label>
                    <select value={mapping[key]} onChange={e => setMapping({ ...mapping, [key]: e.target.value })}>
                      <option value="">— Skip —</option>
                      {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {csvRows.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 'var(--space-lg) 0 var(--space-sm)', color: 'var(--text-secondary)' }}>
                    Preview (first 5 rows)
                  </h4>
                  <div className="preview-table-container">
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>{csvHeaders.map((h, i) => <th key={i}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(0, 5).map((row, ri) => (
                            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: 'var(--space-lg)' }}>
                <button className="btn btn-outline" onClick={() => { setCsvData(null); setCsvHeaders([]); setCsvRows([]); setImportStatus(''); }}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleImport} disabled={importStatus === 'importing'}>
                  {importStatus === 'importing' ? '⏳ Importing...' : `📥 Import ${csvRows.length} Rows`}
                </button>
              </div>

              {importStatus && importStatus !== 'importing' && (
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)',
                  background: importStatus.startsWith('✅') ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
                  color: importStatus.startsWith('✅') ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontSize: '0.9rem' }}>
                  {importStatus}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📊</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
              Export as CSV
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
              Download all transactions as a CSV spreadsheet file.
            </p>
            <button className="btn btn-primary" onClick={handleExportCSV} id="btn-export-csv">
              📥 Download CSV
            </button>
          </div>
          <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🗃️</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
              Export Full Backup
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
              Download all data (accounts, transactions, reminders) as JSON.
            </p>
            <button className="btn btn-success" onClick={handleExportJSON} id="btn-export-json">
              💾 Download JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
