
# Budget App — Visual Strategies

## Overview
A comprehensive Danish budget/accounting app for "Visual Strategies v/Charlotte Rosenberg" with P&L tracking, tax management, and transaction import — built from the provided financial model.

## Pages & Features

### 1. Main Layout with Tab Navigation
- Company header with logo/name
- Four tabs: **Overblik**, **Resultatopgørelse**, **Skat & Moms**, **Import**

### 2. Overblik (Dashboard) Tab
- KPI cards: YTD result, YTD revenue, projected annual result, budget status
- Bar chart: Monthly revenue vs. expenses
- Line chart: Cumulative actual vs. budget
- Top 6 expense categories YTD with progress bars

### 3. Resultatopgørelse (P&L) Tab
- Full chart of accounts with monthly columns (Jan–Dec)
- Dual rows per month: Realized + Budget values
- Collapsible sections (Revenue, Direct costs, Salaries, etc.)
- YTD, Deviation, Projected Year, and Budget Year summary columns
- Toggle for realized months count and zero-value accounts
- Color-coded cells (blue for actual, green for budget positive, red for negative)

### 4. Skat & Moms (Tax) Tab
- **VAT/Moms quarterly table**: Sales tax, purchase tax, net payable, payments tracking
- **B-skat (prepaid tax) table**: 10 installments with amounts, due dates, payment tracking
- **Estimated annual tax**: Configurable tax rate, projected result, estimated tax, residual calculation
- **Total liabilities overview**: Combined outstanding amounts

### 5. Import Tab
- Drag-and-drop Excel/CSV file upload
- Auto-detect header rows (Konto, Beløb columns)
- Preview imported rows before confirming
- Duplicate detection on import
- Transaction ledger view with clear-all option

## Data & State
- All data stored in React state (localStorage persistence)
- Pre-loaded with the provided chart of accounts (PL structure with ~70 accounts)
- Initial sample transactions and budget figures included
- Real-time P&L computation from transactions
- Moms calculation from transaction VAT codes

## Design
- Clean, professional financial UI with Tailwind
- Blue/green/red color coding for financial data
- Responsive tables with sticky headers
- Danish language throughout
- Recharts for all visualizations
