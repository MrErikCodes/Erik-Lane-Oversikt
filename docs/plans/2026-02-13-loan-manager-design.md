# Låneoversikt - Design Document

## Overview

Personal loan management dashboard for tracking and optimizing payoff of 4 Norwegian loans (Huslån, Billån, Forbrukslån, Studielån). Uses the debt snowball/avalanche methods with what-if scenario planning.

## Architecture

**Approach:** Next.js App Router + Server Actions + lowdb (JSON file database)

- Single Next.js 14+ application
- Server Actions for all CRUD operations (no separate API)
- lowdb manages a `db.json` file for persistence
- All calculation logic in shared utility functions
- No authentication (personal tool)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | lowdb (JSON file) |
| Charts | Recharts |
| Data mutations | Server Actions |
| Validation | Zod schemas |
| UI Language | Norwegian |
| Currency | NOK (nb-NO locale) |

## Data Model

### Loans

```json
{
  "id": "uuid",
  "name": "Huslån",
  "type": "housing|car|consumer|student",
  "lender": "DNB",
  "loanNumber": "12345678",
  "originalAmount": 3000000,
  "currentBalance": 2750000,
  "nominalInterestRate": 4.5,
  "effectiveInterestRate": 4.65,
  "monthlyFees": 50,
  "monthlyPayment": 15000,
  "remainingTermMonths": 240,
  "originationDate": "2022-01-15",
  "paymentDueDay": 15,
  "priority": 1,
  "createdAt": "2026-02-13",
  "updatedAt": "2026-02-13"
}
```

### Payments

```json
{
  "id": "uuid",
  "loanId": "uuid",
  "date": "2026-02-15",
  "amount": 15000,
  "principal": 4700,
  "interest": 10250,
  "fees": 50,
  "isExtraPayment": false
}
```

### Scenarios

```json
{
  "id": "uuid",
  "name": "Ekstra 2000kr/mnd",
  "strategy": "snowball|avalanche|custom",
  "extraMonthlyPayment": 2000,
  "customOrder": ["loanId1", "loanId2"],
  "createdAt": "2026-02-13"
}
```

All amounts in NOK. Interest rates as percentages (4.5 = 4.5%).

## Pages

### 1. Oversikt (Dashboard) `/`

- Summary cards: total gjeld, total rente/mnd, total betaling/mnd, estimert gjeldsfri-dato
- Bar chart showing each loan's balance
- Pie chart showing interest distribution across loans
- Monthly progress chart (debt reduction over time)

### 2. Lån (Loans) `/lan`

- Table of all loans with key columns (name, balance, rate, monthly payment, remaining term)
- Click to expand/edit any loan
- "Legg til lån" button to add new loans

### 3. Låndetaljer (Loan Detail) `/lan/[id]`

- Full loan info with edit capability
- Amortization schedule (nedbetalingsplan) showing principal vs interest per month
- Payment history for this specific loan
- Interest cost breakdown

### 4. Kalkulator (Calculator) `/kalkulator`

- Side-by-side comparison: Snowball vs Avalanche vs Custom
- For each strategy: payoff order, total interest paid, months to debt-free, monthly timeline
- Highlight savings per strategy
- "Hva-hvis" (what-if) section: add extra monthly amount, see impact

### 5. Betalingshistorikk (Payment History) `/historikk`

- Full payment log across all loans
- Filter by loan, date range
- Running totals: total paid, total interest paid, total principal paid

### 6. Registrer betaling (Log Payment) `/registrer`

- Form to log a payment: select loan, amount, date
- Auto-calculates principal/interest split based on current balance and rate
- Option to mark as extra payment

## Calculation Engine

### Interest Calculations

- Monthly interest = `(currentBalance * nominalRate / 100) / 12`
- Effective rate = user-entered (includes fees in cost)
- Total interest remaining = sum of future interest from amortization schedule

### Amortization Schedule

Month-by-month table per loan: month #, payment, principal, interest, fees, remaining balance.

### Payoff Strategies

**Snowball:** Sort by balance (lowest first). Pay minimums on all, extra to smallest. Roll payments when one is paid off.

**Avalanche:** Sort by interest rate (highest first). Pay minimums on all, extra to highest rate. Roll payments when one is paid off.

**Custom:** User-defined priority order. Same roll-over logic.

### What-If Scenarios

- User enters extra monthly amount
- Calculator shows: months saved, interest saved, new debt-free date
- Compare against current plan (minimum payments only)

### Key Metrics

- Total gjeld (total debt)
- Total rente betalt (total interest paid)
- Måneder til gjeldsfri (months to debt-free)
- Rente spart (interest saved)
- Gjeldsfri dato (debt-free date)

## UI Design

- Sidebar navigation (collapsible on mobile)
- Dark mode by default
- shadcn/ui components throughout
- NOK currency formatting with nb-NO locale
- Responsive design for desktop and mobile
