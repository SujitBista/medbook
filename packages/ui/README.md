# @medbook/ui - Shared UI Components

This package contains shared React UI components used across the MedBook application.

## Usage

```typescript
import { Button, Input, Card } from '@medbook/ui';
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

```tsx
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
/>
```

**Props:**
- `label`: Optional label text
- `error`: Optional error message
- All standard input HTML attributes

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

