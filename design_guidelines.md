# Gamified Polymarket Dashboard - Design Guidelines

## Design Approach

**Reference-Based Approach**: Gaming UI + Modern Fintech

Drawing inspiration from:
- **Gaming Dashboards**: Steam, Epic Games (achievement systems, progress indicators, stat cards)
- **Modern Trading Platforms**: Robinhood (simplified data presentation), Coinbase (clean crypto aesthetics)
- **Fantasy Sports**: DraftKings, FanDuel (engaging stats, leaderboard vibes)

**Core Principles**:
1. Data clarity meets gaming excitement
2. Achievement-driven engagement
3. Visual hierarchy that celebrates wins and learning from losses
4. Immediate value recognition (stats above the fold)

---

## Layout Structure

### Hero Section (Compact Dashboard Header)
- **Height**: 30-40vh (not full viewport - this is a data dashboard)
- **Content**: Wallet connection input, total portfolio value with animated counter, quick stats (Win Rate %, Total Trades, All-Time PnL)
- **Layout**: Centered content with glassmorphic card treatment containing key metrics
- **No background image needed** - focus on data and gradients

### Main Dashboard Grid
**Desktop Layout**: 3-column grid with varied card heights
**Tablet**: 2-column adaptive grid
**Mobile**: Single column stack

**Section Order**:
1. **Achievement Banner** (full-width): Badge carousel showing milestones (First Trade, 10-Win Streak, Volume Milestones)
2. **PnL Graph Card** (2/3 width): Interactive line chart with time period toggles
3. **Quick Stats Sidebar** (1/3 width): Stacked stat cards with icons and progress bars
4. **Active Positions Table** (full-width): Live positions with unrealized PnL
5. **Trading Volume Metrics** (1/2 width): Circular progress chart + breakdown
6. **Recent Activity Feed** (1/2 width): Scrollable position history with outcome badges
7. **Leaderboard Peek** (full-width): "Top Traders This Week" comparison card

### Spacing System
Use Tailwind spacing units: **3, 4, 6, 8, 12, 16**
- Card padding: p-6 (desktop), p-4 (mobile)
- Grid gaps: gap-6 (desktop), gap-4 (mobile)
- Section spacing: mb-8 between major sections
- Component spacing: space-y-4 for stacked elements

---

## Typography

### Font Selection
**Primary**: 'Inter' (Google Fonts) - clean, modern data presentation
**Accent**: 'Rajdhani' (Google Fonts) - gaming-inspired for stats/numbers

### Hierarchy
- **Hero Stats**: text-5xl font-bold (Rajdhani)
- **Section Headers**: text-2xl font-semibold (Inter)
- **Card Titles**: text-lg font-medium
- **Stat Labels**: text-sm uppercase tracking-wide
- **Big Numbers**: text-4xl font-bold (Rajdhani) with tabular-nums
- **Body Text**: text-base (Inter)
- **Micro Copy**: text-xs

---

## Component Library

### Stat Cards
- Rounded corners (rounded-2xl)
- Border treatment with subtle glow effect
- Icon (from Heroicons - use CDN) at top-left
- Large number display with trend indicator (↑↓)
- Label below with supporting metric
- Padding: p-6

### Achievement Badges
- Circular or hexagonal shape (aspect-square)
- Icon-based with border ring
- Label below badge
- Locked vs unlocked states (opacity treatment)
- Horizontal scroll container on mobile

### PnL Graph
- Use Chart.js library (via CDN)
- Area chart with gradient fill below line
- Interactive tooltips on hover
- Time range selector buttons (24H, 7D, 30D, ALL)
- Grid lines for readability
- Axis labels with proper formatting

### Positions Table
- Striped rows for readability
- Sticky header on scroll
- Columns: Market Name, Entry Price, Current Price, Size, Unrealized PnL, Status
- Status badges (rounded-full px-3 py-1)
- Mobile: Card-based layout instead of table

### Progress Bars
- Rounded-full design
- Height: h-3
- Animated fill on load
- Percentage label overlay or adjacent
- Use for: Volume milestones, Win rate, Trading streaks

### Buttons
Primary Action: rounded-xl px-6 py-3 font-semibold
Secondary: outlined variant with border-2
Icon Buttons: Square (w-10 h-10) for chart controls

### Input Fields (Wallet Connection)
- Large, prominent input: h-14 rounded-xl
- Placeholder: "Enter wallet address or connect"
- Connect button integrated or adjacent
- Icon prefix (wallet icon from Heroicons)

---

## Data Visualization

### Charts (Chart.js via CDN)
**PnL Line Chart**:
- Smooth curves (tension: 0.4)
- Gradient area fill
- Responsive legend
- Crosshair on hover

**Volume Donut Chart**:
- Centered stat in middle
- Legend on side (desktop) or below (mobile)
- Interactive segments

**Trend Indicators**:
- Arrow icons (↑↓) next to percentages
- Sparkline mini-charts for quick trends

---

## Iconography

**Library**: Heroicons (via CDN)
**Usage**:
- Trophy icons for achievements
- Chart icons for graph sections
- Wallet icon for connection
- Fire icon for hot streaks
- Target icon for accuracy metrics
- Clock icon for time-based stats

Icon sizing: w-6 h-6 (cards), w-5 h-5 (inline), w-8 h-8 (achievement badges)

---

## Animation & Interactivity

**Minimal, Purposeful Animations**:
- Stat counter animation on load (count-up effect)
- Progress bar fill animation (duration-1000)
- Card hover: slight scale (scale-105) and shadow increase
- Smooth transitions on all interactive elements (transition-all duration-300)
- Achievement badge pulse on unlock
- **No complex scroll animations** - keep performance high for data updates

---

## Accessibility

- High contrast text on all backgrounds
- Keyboard navigation for all interactive elements
- ARIA labels on stat cards and charts
- Focus states visible on all inputs and buttons
- Table headers properly structured with scope attributes
- Color not sole indicator (use icons + text for profit/loss states)

---

## Special Elements

### Wallet Connection State
**Disconnected**: Large input field with connect button
**Connected**: Condensed header showing abbreviated address with disconnect option

### Empty States
- Friendly illustrations (simple line art)
- Clear CTA: "Connect wallet to view your stats"
- Supporting text explaining what users will see

### Loading States
- Skeleton screens for stat cards
- Loading spinner for chart data
- Shimmer effect on placeholder elements

---

## Mobile Optimization

- Hamburger menu for navigation if multi-page
- Horizontal scroll for achievement badges
- Stacked stat cards (single column)
- Simplified table → card view
- Bottom sheet for detailed position info
- Sticky CTA for wallet connection

---

## Images

**No hero background image needed** - this is a data-focused dashboard where the information IS the visual centerpiece.

**Icon/Badge Graphics**: Achievement badges use Heroicons library, no custom illustrations needed. Focus on clean, data-forward design where numbers and charts create the visual impact.

---

This gamified dashboard balances the excitement of gaming achievements with the clarity required for financial data, creating an engaging experience that encourages users to track and improve their trading performance.