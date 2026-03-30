import { useNavigate, useLocation } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button
          className="legal-back-btn"
          onClick={() => navigate(-1)}
          id="btn-back-privacy"
        >
          ← Back
        </button>

        <div className="legal-header">
          <div className="legal-icon">🔒</div>
          <h1>Privacy Policy</h1>
          <p className="legal-subtitle">Last updated: March 30, 2026</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Our Privacy Commitment</h2>
            <p>
              FinTracker is built with privacy as a <strong>core principle</strong>.
              As an open-source personal finance tracker, we believe your financial data
              is deeply personal and should remain entirely under your control.
            </p>
            <div className="legal-highlight success">
              <span className="legal-highlight-icon">✅</span>
              <div>
                <strong>Zero Data Collection</strong>
                <p>
                  We do not collect, store, transmit, or sell any of your personal or
                  financial data. Period.
                </p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>2. What Data You Enter</h2>
            <p>When using FinTracker, you may enter the following types of information:</p>
            <div className="legal-data-grid">
              <div className="legal-data-item">
                <span className="legal-data-icon">👤</span>
                <div>
                  <strong>Account Information</strong>
                  <p>Name, email, and password for local authentication</p>
                </div>
              </div>
              <div className="legal-data-item">
                <span className="legal-data-icon">🏦</span>
                <div>
                  <strong>Financial Accounts</strong>
                  <p>Account names, types, and balances</p>
                </div>
              </div>
              <div className="legal-data-item">
                <span className="legal-data-icon">💳</span>
                <div>
                  <strong>Transactions</strong>
                  <p>Income, expenses, credits, and debits with amounts and categories</p>
                </div>
              </div>
              <div className="legal-data-item">
                <span className="legal-data-icon">🔔</span>
                <div>
                  <strong>Reminders</strong>
                  <p>Payment and receivable reminders with due dates and amounts</p>
                </div>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>3. How Your Data is Stored</h2>
            <p>
              All data is stored <strong>exclusively in your browser's local storage</strong>
              (IndexedDB). This means:
            </p>
            <ul>
              <li>Your data lives on your device — it never leaves your browser</li>
              <li>No server-side databases store your information</li>
              <li>No cloud synchronization occurs</li>
              <li>Clearing browser data will permanently remove your FinTracker data</li>
            </ul>
            <div className="legal-highlight">
              <span className="legal-highlight-icon">💡</span>
              <div>
                <strong>Pro Tip</strong>
                <p>
                  Regularly export your data using the Import/Export feature to
                  create backups. This protects you from data loss when clearing
                  browser cache or switching devices.
                </p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>4. Third-Party Sharing</h2>
            <div className="legal-highlight success">
              <span className="legal-highlight-icon">🚫</span>
              <div>
                <strong>We Never Share Your Data</strong>
                <p>
                  FinTracker does <strong>not</strong> share, sell, rent, or disclose your
                  data to any third parties. Since data is stored locally and we have no
                  access to it, third-party sharing is technically impossible.
                </p>
              </div>
            </div>
            <p>Specifically, we do NOT:</p>
            <ul>
              <li>Sell your data to advertisers or data brokers</li>
              <li>Share information with analytics companies</li>
              <li>Provide data to any government or corporate entities</li>
              <li>Use your data for marketing or profiling purposes</li>
              <li>Integrate with any third-party tracking services</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Cookies & Tracking</h2>
            <p>
              FinTracker uses only essential browser storage for application functionality:
            </p>
            <ul>
              <li><strong>LocalStorage:</strong> Used only to maintain your login session</li>
              <li><strong>IndexedDB:</strong> Used to store your financial data locally</li>
            </ul>
            <p>
              We do <strong>not</strong> use:
            </p>
            <ul>
              <li>Tracking cookies</li>
              <li>Analytics tools (Google Analytics, etc.)</li>
              <li>Social media trackers</li>
              <li>Advertising pixels</li>
              <li>Fingerprinting techniques</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Data Security</h2>
            <p>
              Security measures implemented in FinTracker:
            </p>
            <div className="legal-sec-grid">
              <div className="legal-sec-item">
                <div className="legal-sec-badge">🔐</div>
                <h4>Password Hashing</h4>
                <p>Passwords are hashed and never stored in plain text</p>
              </div>
              <div className="legal-sec-item">
                <div className="legal-sec-badge">🏠</div>
                <h4>Local Storage</h4>
                <p>All data stays on your device — no remote servers</p>
              </div>
              <div className="legal-sec-item">
                <div className="legal-sec-badge">🔍</div>
                <h4>Open Source</h4>
                <p>Code is publicly auditable for security review</p>
              </div>
              <div className="legal-sec-item">
                <div className="legal-sec-badge">🧱</div>
                <h4>Data Isolation</h4>
                <p>Multi-user data is isolated by user ID</p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>7. Your Rights</h2>
            <p>
              Since your data is stored locally, you have <strong>full control</strong> at all times:
            </p>
            <ul>
              <li><strong>Access:</strong> View all your data directly within the application</li>
              <li><strong>Export:</strong> Download all your data anytime via CSV export</li>
              <li><strong>Delete:</strong> Remove individual records or clear all data entirely</li>
              <li><strong>Portability:</strong> Export and import data to move between devices</li>
              <li><strong>Modification:</strong> Edit or update any record at any time</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>8. Children's Privacy</h2>
            <p>
              FinTracker is not specifically designed for children under the age of 13. We do not
              knowingly collect information from children. If you are under 13, please use this
              application under the supervision of a parent or guardian.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Open Source Transparency</h2>
            <p>
              As an open-source project, our privacy practices are fully transparent:
            </p>
            <ul>
              <li>The entire source code is available for public review</li>
              <li>Anyone can verify our data handling practices by reading the code</li>
              <li>Security researchers are encouraged to audit the application</li>
              <li>Community contributions help improve privacy and security</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be reflected
              on this page with an updated "Last updated" date. Since FinTracker is open-source,
              all changes to the privacy policy are tracked in the project's version history.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Contact</h2>
            <p>
              For privacy-related concerns or questions, please open an issue on the FinTracker
              GitHub repository. Our community is committed to addressing privacy matters promptly.
            </p>
          </section>
        </div>

        <div className="legal-footer-card">
          <p>
            By using FinTracker, you acknowledge that you have read and understood this
            Privacy Policy. Your privacy matters — and with FinTracker, it's always protected.
          </p>
        </div>
      </div>
    </div>
  );
}
