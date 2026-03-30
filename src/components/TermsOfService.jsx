import { useNavigate, useLocation } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();
  const location = useLocation();
  const isStandalone = !location.state?.fromAuth;

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button
          className="legal-back-btn"
          onClick={() => navigate(-1)}
          id="btn-back-tos"
        >
          ← Back
        </button>

        <div className="legal-header">
          <div className="legal-icon">📜</div>
          <h1>Terms of Service</h1>
          <p className="legal-subtitle">Last updated: March 30, 2026</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. About FinTracker</h2>
            <p>
              FinTracker is a <strong>free, open-source</strong> personal finance tracking application.
              It is designed to help individuals manage their finances, track income and expenses,
              set reminders for payments and receivables, and gain insights through visual dashboards.
            </p>
            <div className="legal-highlight">
              <span className="legal-highlight-icon">🔓</span>
              <div>
                <strong>Open Source Software</strong>
                <p>
                  FinTracker is released under an open-source license. You are free to inspect,
                  modify, and distribute the source code in accordance with the license terms.
                  The project is community-driven and transparent.
                </p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>2. Acceptance of Terms</h2>
            <p>
              By accessing or using FinTracker, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the application.
              Your continued use of FinTracker constitutes acceptance of any future updates to these terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. User Responsibilities</h2>
            <p>You are solely responsible for:</p>
            <ul>
              <li>
                <strong>Data Accuracy:</strong> All financial data you enter into FinTracker, including
                transaction amounts, account balances, categories, and reminder details. We do not
                verify or validate the accuracy of your entries.
              </li>
              <li>
                <strong>Account Security:</strong> Maintaining the confidentiality of your login
                credentials. Any activity under your account is your responsibility.
              </li>
              <li>
                <strong>Data Backup:</strong> Creating regular backups of your data using the
                export functionality. We are not responsible for data loss due to hardware
                failure, software issues, or user error.
              </li>
              <li>
                <strong>Financial Decisions:</strong> Any financial decisions made based on
                information displayed in FinTracker. This is a tracking tool, not financial advice.
              </li>
            </ul>
            <div className="legal-highlight warning">
              <span className="legal-highlight-icon">⚠️</span>
              <div>
                <strong>Important Disclaimer</strong>
                <p>
                  FinTracker is a personal tracking tool. It is NOT a replacement for professional
                  financial advice. Always consult a qualified financial advisor for important
                  financial decisions.
                </p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>4. Data Storage & Privacy</h2>
            <p>
              FinTracker stores all your financial data <strong>locally on your device</strong> using
              IndexedDB. Your data never leaves your device unless you explicitly export it.
            </p>
            <ul>
              <li>No data is transmitted to external servers</li>
              <li>No cloud sync or remote storage is used</li>
              <li>No analytics or tracking services collect your financial data</li>
              <li>No third parties have access to your information</li>
            </ul>
            <div className="legal-highlight success">
              <span className="legal-highlight-icon">🛡️</span>
              <div>
                <strong>Your Data, Your Control</strong>
                <p>
                  Since all data is stored locally, you have complete control over your financial
                  information. Use the Import/Export feature to manage your data backups.
                </p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>5. Reminders & Notifications</h2>
            <p>
              FinTracker includes a reminder system for tracking payment and receivable due dates.
              Please note:
            </p>
            <ul>
              <li>Reminders are informational only and do not execute actual financial transactions</li>
              <li>It is your responsibility to act on reminders in a timely manner</li>
              <li>FinTracker is not liable for missed payments or deadlines</li>
              <li>Reminder accuracy depends on the data you provide</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Open Source License</h2>
            <p>
              FinTracker is open-source software. The source code is available publicly and you are
              encouraged to:
            </p>
            <ul>
              <li>Review the code to understand how your data is handled</li>
              <li>Report bugs and security vulnerabilities</li>
              <li>Contribute improvements and new features</li>
              <li>Fork and modify the project for your own use</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Security</h2>
            <p>
              We employ industry-standard security practices for an open-source project:
            </p>
            <ul>
              <li>Passwords are securely hashed — never stored in plain text</li>
              <li>All data remains local to your browser environment</li>
              <li>No external API calls are made with your financial data</li>
              <li>The source code is publicly auditable for security vulnerabilities</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>8. Limitation of Liability</h2>
            <p>
              FinTracker is provided <strong>"as is"</strong> without warranties of any kind,
              express or implied. The developers and contributors are not liable for:
            </p>
            <ul>
              <li>Any direct, indirect, or consequential damages arising from use of the application</li>
              <li>Data loss or corruption due to browser issues, device failures, or software bugs</li>
              <li>Financial losses resulting from reliance on FinTracker's data or reminders</li>
              <li>Service interruptions or application unavailability</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>9. Modifications to Terms</h2>
            <p>
              We reserve the right to update these Terms of Service at any time. Changes will be
              reflected on this page with an updated "Last updated" date. Continued use of
              FinTracker after modifications constitutes acceptance of the revised terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Contact</h2>
            <p>
              FinTracker is an open-source community project. For questions, issues, or
              contributions, please visit the project repository on GitHub. You can report
              bugs, request features, or discuss improvements through the issue tracker.
            </p>
          </section>
        </div>

        <div className="legal-footer-card">
          <p>
            By using FinTracker, you acknowledge that you have read, understood, and agree to
            these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
