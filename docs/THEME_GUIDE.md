# 🎨 Silk Route Theme Guide

## Color Palette

### Primary Colors

| Color Name | Hex | Usage | Tailwind Class |
|-----------|-----|-------|----------------|
| **Background** | `#FFF0E1` | Main app background, card backgrounds | `bg-background` |
| **Foreground** | `#3A3A3A` | Primary text, readable content | `text-foreground` |
| **Primary Text** | `#C8C3FF` | Headings, accent text, brand elements | `text-primary-text` |

### Accent Colors

| Color Name | Hex | Usage | Tailwind Class |
|-----------|-----|-------|----------------|
| **Accent Purple** | `#9A94FF` | Buttons, interactive elements, links | `bg-accent-purple` |
| **Accent Purple Hover** | `#8078FF` | Button hover states | `bg-accent-purple-hover` |
| **Border Lavender** | `#E6E3FF` | Borders, dividers, card outlines | `border-border-lavender` |

### Status Colors

| Color Name | Hex | Usage | Tailwind Class |
|-----------|-----|-------|----------------|
| **Success** | `#CFFFE3` | Success messages, positive feedback | `bg-success` |
| **Success Text** | `#0F7F3F` | Success text color | `text-success-text` |
| **Error** | `#FFCBCB` | Error messages, warnings | `bg-error` |
| **Error Text** | `#C73030` | Error text color | `text-error-text` |
| **Warning** | `#FFE8B3` | Warning messages | `bg-warning` |
| **Warning Text** | `#8B6914` | Warning text color | `text-warning-text` |

### Neutral Grays

| Color Name | Hex | Usage | Tailwind Class |
|-----------|-----|-------|----------------|
| **Gray 50** | `#FAFAFA` | Subtle backgrounds | `bg-gray-50` |
| **Gray 100** | `#F5F5F5` | Light backgrounds | `bg-gray-100` |
| **Gray 200** | `#E5E5E5` | Borders, dividers | `bg-gray-200` |
| **Gray 300** | `#D4D4D4` | Muted borders | `bg-gray-300` |
| **Gray 600** | `#525252` | Secondary text | `text-gray-600` |
| **Gray 900** | `#171717` | Dark text | `text-gray-900` |

---

## UI Component Guidelines

### Buttons

#### Primary Button
```tsx
<button className="bg-accent-purple text-background px-8 py-3 rounded-full font-bold hover:bg-accent-purple-hover transition shadow-lg">
  Click Me
</button>
```

#### Secondary Button
```tsx
<button className="bg-background text-primary-text border-2 border-border-lavender px-8 py-3 rounded-full font-bold hover:border-accent-purple transition">
  Secondary Action
</button>
```

### Cards

```tsx
<div className="bg-background border-2 border-border-lavender rounded-2xl p-6 shadow-sm">
  <h3 className="text-primary-text font-bold text-xl mb-2">Card Title</h3>
  <p className="text-foreground">Card content goes here</p>
</div>
```

### Chat Bubbles

#### Sender (User)
```tsx
<div className="bg-accent-purple text-background p-3 rounded-2xl rounded-br-sm max-w-[80%] shadow-sm">
  Message text
</div>
```

#### Receiver (Other User)
```tsx
<div className="bg-background border-2 border-border-lavender p-3 rounded-2xl rounded-bl-sm max-w-[80%] shadow-sm">
  <div className="text-primary-text font-medium text-xs mb-1">Username</div>
  <div className="text-foreground">Message text</div>
</div>
```

### Navbar

```tsx
<nav className="bg-accent-purple text-background p-4 shadow-md">
  {/* Navbar content */}
</nav>
```

### Input Fields

```tsx
<input 
  type="text"
  className="border-2 border-border-lavender bg-background text-foreground p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-accent-purple"
  placeholder="Enter text..."
/>
```

### Badges/Pills

```tsx
<span className="bg-border-lavender text-primary-text font-semibold px-4 py-1 rounded-full text-sm">
  Badge Text
</span>
```

---

## Design Principles

### 1. **Warm & Trustworthy**
The soft peach-beige background (`#FFF0E1`) creates a welcoming, approachable atmosphere perfect for a marketplace connecting local farmers and buyers.

### 2. **Minimal & Modern**
Clean lines, rounded corners, and generous spacing keep the interface uncluttered and easy to navigate.

### 3. **Accessible Contrast**
- Use `#3A3A3A` (foreground) for primary readable text
- Use `#C8C3FF` (primary-text) for headings and accent text only
- Ensure WCAG AA compliance for all text/background combinations

### 4. **Consistent Interactive Elements**
- All buttons use `rounded-full` for pill-shaped appearance
- Hover states always include `transition` for smooth animations
- Primary actions use `accent-purple`, secondary actions use borders

---

## Typography

### Headings
```tsx
<h1 className="text-4xl font-extrabold text-primary-text">Main Heading</h1>
<h2 className="text-3xl font-bold text-primary-text">Section Heading</h2>
<h3 className="text-2xl font-bold text-foreground">Subsection</h3>
```

### Body Text
```tsx
<p className="text-base text-foreground">Regular paragraph text</p>
<p className="text-sm text-gray-600">Secondary text</p>
<p className="text-xs text-gray-600">Caption text</p>
```

---

## Dark Mode (Future)
Currently using fixed light theme. For dark mode support, add:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #2A2438;
    --foreground: #F5F5F5;
    --primary-text: #D4CFFF;
  }
}
```

---

## Brand Voice
- **Inclusive**: Multilingual, accessible to all
- **Trustworthy**: Fair pricing, transparent negotiations
- **Modern**: AI-assisted, real-time translation
- **Local**: Connecting communities, supporting farmers

---

## Quick Reference

Use these utility classes directly in your components:

```
Backgrounds: bg-background, bg-accent-purple, bg-border-lavender
Text: text-foreground, text-primary-text, text-gray-600
Borders: border-border-lavender, border-accent-purple
Effects: shadow-sm, shadow-md, shadow-lg, rounded-full, rounded-2xl
```

For more examples, see the component implementations in `/frontend/src/components`.
