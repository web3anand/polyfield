# Polymarket Trading Dashboard - Design Guidelines (lighter.gg Inspired)

## Design Approach

**Reference-Based**: lighter.gg Gaming Platform + Modern Trading Interfaces

Inspired by:
- **lighter.gg**: Premium dark UI, clean data hierarchy, sophisticated card treatments
- **Trading Platforms**: Refined minimalism with data-first presentation
- **Modern Gaming**: Sharp contrasts, subtle depth, professional aesthetics

**Core Principles**:
1. Dark sophistication with breathing room
2. Data clarity through hierarchy and whitespace
3. Premium feel via subtle depth and refined typography
4. Professional gaming aesthetic without gamification gimmicks

---

## Layout Structure

### Header Section
- **Height**: Auto (compact, data-focused)
- **Content**: Logo/brand left, prominent centered search bar (50% width desktop), wallet connect right
- **Treatment**: Minimal padding with bottom border separator
- **Search Bar**: Large (h-12), rounded-xl, placeholder "Search by username or wallet address"

### Main Dashboard Grid
**Desktop**: 3-column grid (66% / 33% split for primary/sidebar content)
**Tablet**: 2-column adaptive
**Mobile**: Single column stack

**Section Flow**:
1. **Key Metrics Row** (full-width): 4-card horizontal grid showing Total PnL, Win Rate, Total Volume, Active Positions
2. **Performance Chart** (2/3 width): Large PnL graph with time period toggles
3. **Quick Stats Sidebar** (1/3 width): Recent activity feed with compact position cards
4. **Positions Table** (full-width): Active trades with live data
5. **Analytics Grid** (full-width): 3-column grid of metric cards (Trading Volume, Best Performers, Market Exposure)
6. **Historical Performance** (full-width): Timeline view of closed positions with outcome badges

### Spacing System
Tailwind units: **4, 6, 8, 12, 16, 20**
- Page padding: px-8 py-6 (desktop), px-4 py-4 (mobile)
- Card padding: p-6 (desktop), p-4 (mobile)
- Grid gaps: gap-6 (desktop), gap-4 (mobile)
- Section margins: mb-12 between major sections
- Component spacing: space-y-4 internal stacking

---

## Typography

### Fonts
**Primary**: 'Inter' (Google Fonts) - all text
**Monospace**: 'Menlo' fallback for numerical data (prices, addresses)

### Hierarchy
- **Large Stats**: text-4xl font-bold tracking-tight
- **Section Headers**: text-xl font-semibold
- **Card Titles**: text-base font-medium
- **Stat Labels**: text-sm font-medium tracking-wide
- **Data Values**: text-2xl font-semibold (use tabular-nums)
- **Body Text**: text-sm
- **Supporting Text**: text-xs opacity-70

---

## Component Library

### Stat Cards (Key Metrics)
- Sharp corners (rounded-lg, not rounded-xl)
- Subtle border with card background
- Label at top (text-sm, muted foreground)
- Large value display (text-3xl font-bold)
- Trend indicator below (small percentage with arrow icon)
- Padding: p-6
- Min height for consistency

### Search Bar (Hero Element)
- Prominent size: h-12 w-full max-w-2xl
- Rounded-xl with border treatment
- Search icon (Heroicons) prefix inside field
- Placeholder: "Search trader by username or wallet address..."
- Focus state: border color transitions to primary

### Trading Positions Table
- Minimal borders (border-b on rows only)
- Sticky header with semi-transparent background
- Columns: Market, Entry Price, Current, Size, PnL, Status
- Alternating row treatment (subtle muted background)
- Status badges: rounded-md px-2.5 py-0.5 text-xs font-medium
- Mobile: Transform to stacked cards with horizontal scroll for overflow data

### Performance Chart Card
- Large card (p-6) with header section
- Time period buttons: flex gap-2, rounded-md toggle group
- Chart.js integration (via CDN)
- Gridline styling matches theme (muted, low opacity)
- Tooltip on hover with precise values

### Activity Feed Cards (Sidebar)
- Compact cards (p-4) in scrollable container
- Market name + outcome icon at top
- PnL value prominently displayed
- Timestamp at bottom (text-xs muted)
- Hover state: subtle background shift

### Metric Cards (Analytics Grid)
- Title + icon header
- Large central value or visualization
- Supporting stats below (2-3 sub-metrics)
- Consistent height across row

### Buttons
**Primary**: rounded-lg px-4 py-2 font-medium (primary background)
**Secondary**: outlined with border-2
**Icon Only**: w-9 h-9 rounded-md for chart controls
**Search/Connect**: h-10 px-6 rounded-lg

---

## Data Visualization

### Charts (Chart.js via CDN)
**PnL Line Chart**:
- Area gradient fill using chart-1 color
- Clean axis labels (foreground at 70% opacity)
- No background grid (minimal aesthetic)
- Smooth curves (tension: 0.3)
- Interactive crosshair on hover

**Donut/Distribution Charts**:
- Use chart colors (chart-1 through chart-5)
- Legend positioned right (desktop), bottom (mobile)
- Center label with primary stat

**Trend Indicators**:
- Inline arrows (↑↓) with value
- Use chart-2 (green) for positive, destructive for negative
- Small sparklines (w-16 h-8) for mini-trends

---

## Iconography

**Library**: Heroicons (Outline variant via CDN)
**Common Icons**:
- MagnifyingGlass (search)
- Wallet (connection)
- ChartBar (analytics)
- ArrowTrending (trends)
- Clock (time/history)
- CheckCircle/XCircle (outcomes)

**Sizing**: w-5 h-5 (default), w-4 h-4 (small inline), w-6 h-6 (card headers)

---

## Animations

**Minimal, Performance-Focused**:
- Smooth transitions on interactive elements (transition-colors duration-200)
- Hover scale on cards (hover:scale-[1.01])
- Loading skeletons for data fetch (pulse animation)
- Chart animations on initial render only
- No scroll-triggered animations

---

## Accessibility

- Minimum contrast ratios met with provided theme
- Keyboard navigation for all controls
- ARIA labels on data visualizations
- Focus-visible states on all interactive elements
- Table semantic markup with proper headers
- Screen reader text for icon-only buttons

---

## Mobile Optimization

- Sticky header with search (collapsible on scroll)
- Stack metric cards (single column)
- Horizontal scroll for tables (touch-friendly)
- Bottom sheet modals for detailed position views
- Larger touch targets (min h-11 for buttons)
- Condensed wallet address display

---

## Images

**No Hero Background**: This is a data dashboard - the information is the visual focus.

**Profile/Logo Graphics**: Use placeholder avatar circles for trader profiles in activity feed. Brand logo in header uses simple SVG or text treatment. All visual interest comes from data visualization and thoughtful spacing, not imagery.

---

## Special States

### Empty States
- Centered content with search icon
- Heading: "Enter a username to view trading stats"
- Supporting text explaining functionality
- No illustrations needed - keep minimal

### Loading States
- Skeleton screens matching card layouts
- Shimmer effect on placeholders
- Spinner for chart data loading

### Error States
- Inline error messages below search
- Clear action guidance ("Wallet not found - verify address")

---

This design creates a premium, professional trading dashboard that prioritizes data clarity, spacious layouts, and sophisticated dark aesthetics inspired by lighter.gg's refined gaming interface approach.