# AGENTS.md

## Project
Build **SplitBill+**, a responsive web app for splitting bills, calculating tax/service/tip, scanning receipts, managing groups, and viewing spending history.

Desktop-first, but fully usable on mobile web.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui when useful
- Framer Motion for subtle animation
- Recharts for charts
- Zod for validation
- Vitest + React Testing Library

## Main Features
1. Dashboard
   - current tax information
   - tax rate, effective date, last updated, source
   - monthly spending
   - recent transactions
   - quick actions

2. Split Bill
   - equal split
   - custom split
   - split by item
   - tax
   - service charge
   - tip
   - deterministic rounding

3. Scan Receipt
   - upload image / mobile camera input
   - OCR-ready flow
   - editable detected items
   - assign items to participants

4. Groups
   - friends
   - family
   - office
   - group transaction history

5. History & Analytics

6. Settings
   - light/dark theme
   - currency

## UI Direction
Style: modern Indonesian fintech.

Use:
- white + blue as primary palette
- subtle blue gradients
- rounded cards
- soft shadows
- clean typography
- restrained glass effects
- subtle motion
- generous whitespace

Do not copy BRI, BCA, Mandiri, Pertamina, or other brands directly.
Use them only as quality inspiration.

Use design values from:
`/assets/design-tokens.json`

## Responsive
Desktop:
- max width around 1440px
- sidebar + topbar
- multi-column dashboard

Tablet:
- compact navigation
- 2-column sections where appropriate

Mobile:
- single-column layout
- no horizontal overflow
- touch targets >= 44px
- bottom navigation may replace sidebar
- tables must become responsive cards/lists

## Assets
Use existing assets from `/public/assets/`.

Available:
- logo.png
- app-icon.png
- avatar.png
- icons-nav.png
- icons-category.png
- hero.png
- illustration-group.png
- illustration-receipt.png
- illustration-calculator.png
- illustration-tax.png
- illustration-wallet.png
- illustration-bank.png
- receipt-sample.png
- empty-transactions.png
- empty-error.png

Reference-only UI assets:
- sidebar.png
- topbar.png
- button-primary.png
- button-secondary.png
- card-tax.png
- card-spending.png
- card-group.png
- split-bill-form.png
- split-bill-result.png
- scan-upload.png
- transaction-list.png

Reference-only assets should guide implementation.
Do not render screenshots as fake UI when a real reusable component can be built.

## Money Rules
- Never use floating-point math for money.
- Store/calculation values as integer minor units.
- Distributed total must equal final bill exactly.
- Rounding remainder must be assigned deterministically.
- Format Rupiah consistently.

## Tax Rules
Do not hardcode a single tax rate as universally valid.

Tax data must support:
- tax type
- rate
- effective date
- last updated
- official source

Allow manual tax override when calculating a bill.

Keep tax-fetching logic separate from calculation logic.

## Architecture
Prefer feature-based structure:

src/
- app/
- components/
- features/
  - dashboard/
  - split-bill/
  - receipt/
  - groups/
  - history/
  - tax/
  - settings/
- lib/
- hooks/
- types/

Keep business logic outside React presentation components.

## Code Quality
- strict TypeScript
- avoid `any`
- small reusable components
- semantic HTML
- accessibility-first
- validate external data with Zod
- handle loading, empty, error, and success states
- avoid unnecessary dependencies
- do not duplicate business logic
- do not rewrite unrelated code

## Animation
Use Framer Motion sparingly:
- page/card fade + small translate
- button hover/tap
- number changes
- chart reveal
- modal/drawer transitions

Avoid distracting animation.

## Tests
At minimum cover:
- tax calculation
- service charge
- tip
- equal split
- custom split validation
- rounding remainder
- split-by-item totals

Critical UI flows should have component tests.

## Workflow
For every task:

1. Read this file.
2. Inspect existing code before editing.
3. Make the smallest coherent change.
4. Reuse existing components before creating new ones.
5. Run formatter.
6. Run lint.
7. Run tests.
8. Fix failures before stopping.

Do not leave broken builds, lint errors, or failing tests.
