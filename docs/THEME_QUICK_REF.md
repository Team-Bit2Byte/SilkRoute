# 🚀 Silk Route Theme - Quick Reference

## Color Classes (Use These!)

### Backgrounds
```
bg-background           (#FFF0E1) - Main app background
bg-accent-purple        (#9A94FF) - Buttons, headers
bg-accent-purple-hover  (#8078FF) - Button hover
bg-border-lavender      (#E6E3FF) - Light backgrounds
bg-success              (#CFFFE3) - Success messages
bg-error                (#FFCBCB) - Error messages
bg-warning              (#FFE8B3) - Warning messages
```

### Text Colors
```
text-foreground         (#3A3A3A) - Primary readable text
text-primary-text       (#C8C3FF) - Headings, accent text
text-gray-600           (#525252) - Secondary text
text-success-text       (#0F7F3F) - Success message text
text-error-text         (#C73030) - Error message text
text-warning-text       (#8B6914) - Warning message text
```

### Borders
```
border-border-lavender  (#E6E3FF) - Default borders
border-accent-purple    (#9A94FF) - Accent borders
border-gray-200         (#E5E5E5) - Neutral borders
```

---

## Component Snippets

### Button
```tsx
// Primary
<button className="bg-accent-purple text-background px-6 py-2 rounded-full font-bold hover:bg-accent-purple-hover transition">
  Click Me
</button>

// Secondary
<button className="bg-background text-foreground border-2 border-border-lavender px-6 py-2 rounded-full hover:border-accent-purple transition">
  Cancel
</button>
```

### Card
```tsx
<div className="bg-background border-2 border-border-lavender rounded-2xl p-6 shadow-sm">
  <h3 className="text-primary-text font-bold text-xl mb-2">Title</h3>
  <p className="text-foreground">Content</p>
</div>
```

### Input
```tsx
<input 
  type="text"
  className="border-2 border-border-lavender bg-background text-foreground p-2 rounded-full focus:ring-2 focus:ring-accent-purple outline-none"
/>
```

### Badge
```tsx
<span className="bg-border-lavender text-primary-text px-3 py-1 rounded-full text-sm font-medium">
  New
</span>
```

### Alert Success
```tsx
<div className="bg-success border-2 border-success-text/20 text-success-text p-4 rounded-2xl">
  Success message
</div>
```

### Alert Error
```tsx
<div className="bg-error border-2 border-error-text/20 text-error-text p-4 rounded-2xl">
  Error message
</div>
```

---

## Layout Patterns

### Container
```tsx
<div className="max-w-4xl mx-auto p-6">
  {/* Content */}
</div>
```

### Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>
```

### Flex Row
```tsx
<div className="flex items-center gap-4">
  {/* Items */}
</div>
```

---

## Typography Scale

```
text-xs     - 12px
text-sm     - 14px
text-base   - 16px (default)
text-lg     - 18px
text-xl     - 20px
text-2xl    - 24px
text-3xl    - 30px
text-4xl    - 36px
text-6xl    - 60px
```

---

## Spacing Scale

```
p-1  - 4px      px-2 - 8px
p-2  - 8px      px-4 - 16px
p-3  - 12px     px-6 - 24px
p-4  - 16px     px-8 - 32px
p-6  - 24px
```

---

## Border Radius

```
rounded-sm    - 2px
rounded       - 4px
rounded-lg    - 8px
rounded-xl    - 12px
rounded-2xl   - 16px
rounded-full  - 9999px (pill shape)
```

---

## Shadow Scale

```
shadow-sm  - Subtle
shadow     - Default
shadow-md  - Medium
shadow-lg  - Large
shadow-xl  - Extra large
```

---

## Pro Tips

1. **Always use `rounded-full` for buttons** - it's our signature style
2. **Use `transition` on interactive elements** for smooth hover effects
3. **Pair `text-primary-text` with headings**, `text-foreground` for body text
4. **Add `shadow-sm` or `shadow-md` to cards** for depth
5. **Use `border-2` instead of `border`** for more prominent borders

---

## Examples in the Wild

- **Landing Page**: `/frontend/src/app/page.tsx`
- **Chat Interface**: `/frontend/src/components/ChatInterface.tsx`
- **Navbar**: `/frontend/src/components/layout/Navbar.tsx`

---

For full documentation, see [THEME_GUIDE.md](./THEME_GUIDE.md)
