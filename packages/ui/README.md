# @medbook/ui - Shared UI Components

This package contains shared React UI components used across the MedBook application.

## Usage

```typescript
import { Button, Input, Card } from "@medbook/ui";
```

## Components

### Button

```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

**Props:**

- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- All standard button HTML attributes

### Input

A versatile input component with built-in password visibility toggle and error handling.

**Basic Usage:**

```tsx
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
/>
```

**Password Input with Visibility Toggle:**

```tsx
<Input
  label="Password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  error={errors.password}
/>
```

When `type="password"`, the Input component automatically displays an eye icon inside the input field that allows users to toggle password visibility. The icon is positioned inside the input field using a flexbox wrapper for optimal UX.

**Props:**

- `label`: Optional label text displayed above the input
- `error`: Optional error message displayed below the input (also sets error styling)
- `type`: Input type (use `"password"` to enable visibility toggle)
- All standard input HTML attributes are supported

**Features:**

- Automatic password visibility toggle for `type="password"` inputs
- Error state styling (red border when error is present)
- Focus ring styling for accessibility
- Proper ARIA attributes for screen readers
- Disabled state support

### Card

```tsx
<Card title="Card Title" footer={<Button>Action</Button>}>
  Card content goes here
</Card>
```

**Props:**

- `title`: Optional card title
- `footer`: Optional footer content
- `className`: Additional CSS classes

## Building

```bash
pnpm build
```

## Development

Components are automatically compiled to `dist/` directory when built. The package exports both JavaScript and TypeScript declaration files.

## Styling

Components use Tailwind CSS classes. Make sure Tailwind is configured in your app to use the shared config from `@medbook/tailwind-config`.
