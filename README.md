# FinTracker React

FinTracker React is a personal finance web application for managing accounts, transactions, reminders, and data import or export. The frontend is built with React and Vite, and it communicates with a REST-style backend backed by Cloudflare D1.

The app is designed for individual users who want a simple finance tracker with charts, CSV import, reminder automation, and account-level transaction tracking.

## Project Stack

### Frontend

- React 19
- Vite 6
- React Router DOM 7
- Recharts for dashboards and charts
- CSS with a custom design system in `src/index.css`

### Data and API Layer

- Cloudflare D1-backed API accessed through REST endpoints
- Fetch-based client in `src/db/database.js`
- Session restoration through browser `localStorage`
- Auth-related request tokens stored in browser cookies

### Security and Bot Protection

- Cloudflare Turnstile on the authentication page
- Honeypot field to block simple automated form submissions
- Client-side SHA-256 password hashing before submission
- Secure cookies with `sameSite: 'strict'` and `secure: true` for token persistence

### Build and Tooling

- Node.js and npm
- Vite dev server and production build pipeline
- Lazy-loaded route-level bundles for better initial load performance

## Core Functionalities

### 1. Authentication

Users can register and sign in from a dedicated authentication screen.

Implemented behavior:

- Registration with name, email, and password
- Login with email and password
- Session restoration after refresh using `localStorage`
- Terms and Privacy acceptance gate before auth submission
- Cloudflare Turnstile verification before form submission
- Honeypot-based bot filtering

Files involved:

- `src/components/AuthPage.jsx`
- `src/context/AuthContext.jsx`
- `src/db/database.js`

### 2. Dashboard

The dashboard summarizes a user’s financial position and renders visual analytics.

Included metrics:

- Net balance
- Total income
- Total expense
- Total credit
- Total debit
- Pending payments from reminders
- Pending receivables from reminders
- Income to expense ratio

Visualizations:

- Monthly trend chart
- Transaction breakdown pie chart
- Expense by category bar chart

The dashboard filters data by account and date range.

### 3. Accounts Management

Users can create and manage multiple financial accounts such as:

- Savings
- Checking
- Credit card
- Cash
- Investment
- Loan
- Other custom account types supported by the UI list

Per-account behavior:

- Add account with opening balance
- Edit account details
- Delete account
- Show computed live balance based on opening balance plus transactions
- Show transaction count per account

### 4. Transactions Management

Users can maintain a transaction ledger linked to their accounts.

Supported transaction types:

- Income
- Expense
- Transfer
- Credit
- Debit

Features:

- Add transaction
- Edit transaction
- Delete transaction
- Filter by type
- Filter by account
- Search by description, category, or reference
- Mobile-friendly transaction card layout
- Transfer flow creates paired outgoing and incoming entries

### 5. Reminders

Reminders help users track upcoming payments and receivables.

Features:

- Add payment reminders
- Add receivable reminders
- Edit and delete reminders
- Filter by active, payment, receivable, overdue, and completed
- Mark reminder as completed or undo completion
- Optional account linkage
- Optional recurring schedule

Recurring options:

- One-time
- Weekly
- Monthly
- Quarterly
- Yearly

Automation behavior:

- Completing an account-linked reminder can auto-create a transaction
- Undoing a completed linked reminder removes the generated transaction
- Completing a recurring reminder generates the next reminder occurrence
- Undoing a recurring completed reminder removes the generated next reminder

### 6. Import and Export

The app supports moving data in and out of the system.

Import capabilities:

- CSV upload for transaction imports
- Drag and drop CSV support
- Auto-detection of common column names
- Manual mapping for date, amount, description, type, category, and reference
- Import into a selected account
- Preview of the first five rows before import

Export capabilities:

- Full JSON export including accounts, transactions, reminders, and export timestamp
- CSV export of transactions

## Performance Notes

The app now includes route-level lazy loading so that heavy screens are loaded on demand instead of in the first bundle.

Implemented performance improvements:

- Lazy-loaded page components in `src/App.jsx`
- Skeleton loading states on major pages
- Reduced initial JavaScript bundle size by splitting route chunks
- Mobile-responsive transaction and reminder layouts to reduce rendering issues on smaller screens

## Project Structure

```text
.
|-- index.html
|-- package.json
|-- vite.config.js
|-- public/
`-- src/
	|-- App.jsx
	|-- main.jsx
	|-- index.css
	|-- assets/
	|-- components/
	|   |-- Accounts.jsx
	|   |-- AuthPage.jsx
	|   |-- Dashboard.jsx
	|   |-- ImportExport.jsx
	|   |-- Layout.jsx
	|   |-- PrivacyPolicy.jsx
	|   |-- Reminders.jsx
	|   |-- TermsOfService.jsx
	|   `-- Transactions.jsx
	|-- context/
	|   `-- AuthContext.jsx
	`-- db/
		`-- database.js
```

## Setup Guidelines

### Prerequisites

- Node.js 18 or newer recommended
- npm
- A running backend that exposes the expected D1 API endpoints

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root.

Example:

```env
VITE_D1_API_URL=https://your-api.example.com
VITE_D1_API_TOKEN=your-api-token
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

Variable usage:

- `VITE_D1_API_URL`: Base URL for the REST API used by the frontend
- `VITE_D1_API_TOKEN`: Static API authorization token sent as a bearer token
- `VITE_TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key for the auth form

### 3. Start the development server

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

### 5. Preview the production build locally

```bash
npm run preview
```

## Available Scripts

- `npm run dev`: Start the Vite development server
- `npm run build`: Create a production build
- `npm run preview`: Preview the production build locally
- `npm run lint`: Run ESLint if linting is configured in the environment

## Backend Expectations

The frontend assumes the backend exposes endpoints for:

- User registration and login
- User lookup by ID or email
- Accounts CRUD
- Transactions CRUD
- Reminders CRUD
- Query endpoint for bulk or relational operations

Examples visible in the frontend data layer:

- `/rest/register`
- `/rest/login`
- `/rest/getuser/:id`
- `/rest/accounts`
- `/rest/transactions`
- `/rest/reminders`
- `/query`

## Security Details

This section describes the current implementation as it exists in the codebase.

### Implemented protections

#### Password hashing in the browser

Passwords are hashed with SHA-256 in `src/db/database.js` before being sent to the API.

What this does:

- Avoids sending raw plain-text passwords from the UI layer

What to know:

- This is not a replacement for strong server-side password hashing
- The backend should still hash credentials again with a password-specific algorithm such as Argon2, scrypt, or bcrypt with salt

#### Turnstile bot protection

The auth screen uses Cloudflare Turnstile to reduce automated abuse.

Current flow:

- The user must complete the challenge
- Form submission is blocked unless Turnstile succeeds
- A hidden honeypot field adds a simple bot trap

#### Session and token handling

The app currently uses two client-side persistence mechanisms:

- `localStorage` stores the app session reference (`userId`)
- Browser cookies store `token` and `tokenKey`

Cookie flags currently set in the frontend:

- `secure: true`
- `sameSite: 'strict'`
- `path: '/'`

Important limitation:

- Because cookies are created from frontend JavaScript, they cannot be `HttpOnly`
- If XSS is introduced elsewhere in the app, browser-accessible tokens are at risk

#### Data scoping

Most fetch operations include the current `userId` in request parameters so the UI only requests that user’s data.

Important limitation:

- Real authorization must still be enforced by the backend
- Frontend filtering alone is not a security boundary

### Recommended production hardening

If you are deploying this project for real users, the following improvements are strongly recommended:

1. Move authentication and token issuance fully server-side.
2. Use `HttpOnly`, secure, same-site cookies issued by the server.
3. Replace client-side SHA-256-only credential protection with server-side Argon2, scrypt, or bcrypt.
4. Ensure every API endpoint validates the authenticated user independently of request query params.
5. Add rate limiting on auth and sensitive endpoints.
6. Add CSRF protection if cookie-based auth is used across origins.
7. Add Content Security Policy headers to reduce XSS risk.
8. Audit any backend endpoint that accepts raw SQL-like query input.
9. Rotate and protect the API token used by the frontend.
10. Avoid storing highly sensitive banking secrets, PINs, OTPs, or full account credentials.

## Functional Flow Summary

High-level user journey:

1. The user registers or logs in.
2. Auth state is restored from local storage on later visits.
3. The user creates accounts.
4. The user adds transactions or imports them from CSV.
5. The dashboard aggregates transactions and reminders into summary cards and charts.
6. The user creates reminders for future payments or receivables.
7. The user exports data when needed as JSON or CSV.

## Known Constraints

- The frontend assumes a compatible backend is already available.
- Security strength depends heavily on backend enforcement, not only on UI checks.
- Browser-side token handling is practical for a prototype or controlled deployment, but not ideal for a hardened production environment.

## Development Notes

- Main data access logic lives in `src/db/database.js`.
- Auth state is managed in `src/context/AuthContext.jsx`.
- Layout and navigation are handled in `src/components/Layout.jsx`.
- Page-level code splitting is configured in `src/App.jsx` through `React.lazy()`.
- Global styling and responsive behavior live in `src/index.css`.

## License and Ownership

This repository does not currently define a license in `package.json` or the root documentation. Add a license file if you want to publish or distribute the project with explicit usage terms.
