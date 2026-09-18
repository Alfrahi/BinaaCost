# Design System Theme Tokens

## CSS Custom Properties (defined in `src/index.css` or `tailwind.config.ts`)

### Colors
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `#ffffff` | `#0f172a` | Page background |
| `--foreground` | `#0f172a` | `#f8fafc` | Primary text |
| `--card` | `#ffffff` | `#1e293b` | Card surface |
| `--card-foreground` | `#0f172a` | `#f8fafc` | Card text |
| `--popover` | `#ffffff` | `#1e293b` | Popover surface |
| `--popover-foreground` | `#0f172a` | `#f8fafc` | Popover text |
| `--primary` | `#3b82f6` | `#60a5fa` | Brand primary |
| `--primary-foreground` | `#ffffff` | `#0f172a` | On-primary text |
| `--secondary` | `#f1f5f9` | `#334155` | Secondary surface |
| `--secondary-foreground` | `#0f172a` | `#f8fafc` | On-secondary text |
| `--muted` | `#f1f5f9` | `#334155` | Muted surface |
| `--muted-foreground` | `#64748b` | `#94a3b8` | Muted text |
| `--accent` | `#f1f5f9` | `#334155` | Accent surface |
| `--accent-foreground` | `#0f172a` | `#f8fafc` | On-accent text |
| `--destructive` | `#ef4444` | `#f87171` | Error/danger |
| `--destructive-foreground` | `#ffffff` | `#0f172a` | On-destructive text |
| `--success` | `#22c55e` | `#4ade80` | Success states |
| `--success-foreground` | `#ffffff` | `#0f172a` | On-success text |
| `--warning` | `#f59e0b` | `#fbbf24` | Warning states |
| `--warning-foreground` | `#ffffff` | `#0f172a` | On-warning text |
| `--info` | `#3b82f6` | `#60a5fa` | Info states |
| `--info-foreground` | `#ffffff` | `#0f172a` | On-info text |
| `--border` | `#e2e8f0` | `#334155` | Borders |
| `--input` | `#e2e8f0` | `#334155` | Input borders |
| `--ring` | `#3b82f6` | `#60a5fa` | Focus rings |

### Semantic Color Aliases (Tailwind)
```css
/* Backgrounds */
bg-background, bg-card, bg-popover, bg-primary, bg-secondary,
bg-muted, bg-accent, bg-destructive, bg-success, bg-warning, bg-info

/* Text */
text-foreground, text-card-foreground, text-popover-foreground,
text-primary-foreground, text-secondary-foreground, text-muted-foreground,
text-accent-foreground, text-destructive-foreground, text-success-foreground,
text-warning-foreground, text-info-foreground

/* Borders */
border-border, border-input, border-primary, border-destructive,
border-success, border-warning, border-info

/* Rings */
focus-visible:ring-ring, focus-visible:ring-primary, focus-visible:ring-destructive,
focus-visible:ring-success, focus-visible:ring-warning, focus-visible:ring-info
```

### Spacing Scale
| Step | Value | Rem |
|------|-------|-----|
| 0 | `0` | `0` |
| 1 | `0.25rem` | `4px` |
| 2 | `0.5rem` | `8px` |
| 3 | `0.75rem` | `12px` |
| 4 | `1rem` | `16px` |
| 5 | `1.25rem` | `20px` |
| 6 | `1.5rem` | `24px` |
| 8 | `2rem` | `32px` |
| 10 | `2.5rem` | `40px` |
| 12 | `3rem` | `48px` |
| 16 | `4rem` | `64px` |

Used via Tailwind: `p-4`, `m-2`, `gap-3`, `space-y-4`, etc.

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| `rounded-none` | `0` | Sharp corners |
| `rounded-sm` | `0.125rem` (2px) | Badges, small elements |
| `rounded-md` | `0.375rem` (6px) | Buttons, inputs, cards (default) |
| `rounded-lg` | `0.5rem` (8px) | Cards, dialogs, sheets |
| `rounded-xl` | `0.75rem` (12px) | Large containers |
| `rounded-2xl` | `1rem` (16px) | Hero sections |
| `rounded-full` | `9999px` | Pills, avatars, badges |

### Typography Scale
| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | `0.75rem` (12px) | `1rem` | Captions, labels |
| `text-sm` | `0.875rem` (14px) | `1.25rem` | Body small, inputs |
| `text-base` | `1rem` (16px) | `1.5rem` | Body default |
| `text-lg` | `1.125rem` (18px) | `1.75rem` | Body large |
| `text-xl` | `1.25rem` (20px) | `1.75rem` | Subheadings |
| `text-2xl` | `1.5rem` (24px) | `2rem` | Headings |
| `text-3xl` | `1.875rem` (30px) | `2.25rem` | Large headings |
| `text-4xl` | `2.25rem` (36px) | `2.5rem` | Page titles |

### Font Weights
| Token | Value | Usage |
|-------|-------|-------|
| `font-normal` | `400` | Body text |
| `font-medium` | `500` | Labels, emphasis |
| `font-semibold` | `600` | Headings, buttons |
| `font-bold` | `700` | Strong emphasis |

### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Cards, inputs |
| `shadow` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | Default elevation |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Dropdowns, tooltips |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Dialogs, sheets |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | Modals |
| `--shadow-card` | `var(--shadow-sm)` | Card elevation (CSS variable) |
| `--shadow-dropdown` | `var(--shadow-md)` | Dropdown elevation (CSS variable) |
| `--shadow-modal` | `var(--shadow-lg)` | Modal elevation (CSS variable) |

### Semantic Color Aliases (CSS Variables)
| CSS Variable | Maps To | Usage |
|--------------|---------|-------|
| `--surface` | `--card` | Surface/container background |
| `--surface-foreground` | `--card-foreground` | Surface text |
| `--danger` | `--destructive` | Danger/error states |
| `--danger-foreground` | `--destructive-foreground` | On-danger text |

### Chart Palette (CSS Variables)
| CSS Variable | Light Theme | Dark Theme | Usage |
|--------------|-------------|------------|-------|
| `--chart-1` | `195 89% 46%` (#0088FE) | `195 89% 56%` | Cost category 1 (materials) |
| `--chart-2` | `162 100% 41%` (#00C49F) | `162 100% 51%` | Cost category 2 (labor) |
| `--chart-3` | `48 100% 58%` (#FFBB28) | `48 100% 68%` | Cost category 3 (equipment) |
| `--chart-4` | `21 100% 63%` (#FF8042) | `21 100% 73%` | Cost category 4 (additional) |
| `--chart-5` | `217 91% 60%` (#60A5FA) | `217 91% 70%` | Scenario: original |
| `--chart-6` | `142 76% 36%` (#34D399) | `142 76% 46%` | Scenario: simulated |
| `--chart-emphasis-shadow` | `rgba(0, 0, 0, 0.5)` | `rgba(255, 255, 255, 0.3)` | Chart emphasis shadow |

### Transitions
| Token | Value | Usage |
|-------|-------|-------|
| `transition-colors` | `color, background-color, border-color, text-decoration-color, fill, stroke` | Interactive states |
| `transition-all` | `all` | Complex animations |
| `duration-150` | `150ms` | Fast interactions |
| `duration-200` | `200ms` | Default (dialogs, tooltips) |
| `duration-300` | `300ms` | Slower animations |

### Breakpoints (Tailwind)
| Token | Min Width |
|-------|-----------|
| `sm` | `640px` |
| `md` | `768px` |
| `lg` | `1024px` |
| `xl` | `1280px` |
| `2xl` | `1536px` |

### Z-Index Scale
| Layer | Value |
|-------|-------|
| Base | `0` |
| Dropdown | `10` |
| Sticky | `20` |
| Fixed | `30` |
| Modal Backdrop | `40` |
| Modal | `50` |
| Popover | `50` |
| Tooltip | `60` |
| Toast | `70` |

## Component Token Mapping

### Button
- Background: `bg-primary` / `bg-secondary` / `bg-destructive` / `bg-background` (outline) / `transparent` (ghost)
- Text: `text-primary-foreground` / `text-secondary-foreground` / `text-destructive-foreground` / `text-foreground`
- Border: `border-input` (outline)
- Ring: `focus-visible:ring-ring`
- Radius: `rounded-md`
- Padding: `h-10 px-4` (default), `h-9 px-3` (sm), `h-11 px-8` (lg)

### Input
- Background: `bg-transparent`
- Border: `border-input`
- Text: `text-foreground`
- Placeholder: `text-muted-foreground`
- Ring: `focus-visible:ring-ring`
- Radius: `rounded-md`
- Height: `h-10` (default), `h-8` (sm), `h-12` (lg)
- Error state: `border-destructive focus-visible:ring-destructive`
- Success state: `border-success focus-visible:ring-success`

### Card
- Background: `bg-card`
- Text: `text-card-foreground`
- Border: `border-border` (default), `border-primary` (outline), `border-none` (elevated)
- Shadow: `shadow-sm` (default), `shadow-lg` (elevated)
- Radius: `rounded-lg`
- Padding: `p-6` (content), `pt-0` (content/header/footer adjustment)

### Dialog
- Background: `bg-background`
- Border: `border-border`
- Shadow: `shadow-lg`
- Radius: `sm:rounded-lg`
- Max-width: `max-w-sm` (sm), `max-w-lg` (default), `max-w-2xl` (lg), `max-w-4xl` (xl), `max-w-[90vw]` (full)
- Animation: `duration-200` with `zoom-in-95`/`fade-in-0`

### Select
- Trigger background: `bg-background`
- Trigger border: `border-input`
- Trigger text: `text-foreground`
- Content background: `bg-popover`
- Content text: `text-popover-foreground`
- Content shadow: `shadow-md`
- Ring: `focus:ring-ring`
- Radius: `rounded-md`
- Item hover: `bg-accent text-accent-foreground`

### Tabs
- List background: `bg-muted` (box/enclosed), `transparent` (line)
- Trigger active: `bg-background` (box/enclosed), `border-b-2 border-primary` (line)
- Trigger inactive: `text-muted-foreground`
- Radius: `rounded-sm` (trigger), `rounded-md` (list)

### Badge
- Default: `bg-primary/10 text-primary`
- Secondary: `bg-secondary text-secondary-foreground`
- Muted: `bg-muted text-muted-foreground`
- Success: `bg-success/10 text-success`
- Destructive: `bg-destructive/10 text-destructive`
- Outline: `border border-border text-foreground`
- Radius: `rounded-full`
- Padding: `px-2 py-0.5`
- Font: `text-xs font-medium`

### Table
- Font: `text-sm` (default), `text-xs` (sm), `text-base` (lg)
- Header: `h-12 px-4 text-start font-medium text-muted-foreground`
- Cell: `p-4 align-middle`
- Row hover: `hover:bg-muted/50`
- Row selected: `data-[state=selected]:bg-muted`
- Striped: `tbody tr:nth-child(even):bg-muted/30`
- Bordered: `th, td: border border-border`

### Toast (Sonner)
- Default: `bg-background text-foreground border-border`
- Success: `bg-success/10 text-success border-success`
- Error: `bg-destructive/10 text-destructive border-destructive`
- Warning: `bg-warning/10 text-warning border-warning`
- Info: `bg-info/10 text-info border-info`
- Shadow: `shadow-lg`

## Usage Guidelines

1. **Always use semantic tokens** — never hardcode hex values in components
2. **Prefer CSS variables** — they enable theming and dark mode
3. **Use logical properties** — `ms-`/`me-`/`ps-`/`pe-` for RTL support
4. **Respect the spacing scale** — use Tailwind's spacing utilities
5. **Match border radius** — components should use consistent radius scale
6. **Test in both themes** — verify light and dark mode rendering