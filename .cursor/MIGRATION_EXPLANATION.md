# Cursor Rules Migration Explanation

## What is `.mdc` Format?

`.mdc` stands for **Markdown with Cursor** - it's a markdown file format that Cursor uses for rule files. It consists of:

1. **YAML Frontmatter** (between `---` markers at the top)
   - Contains metadata about the rule
   - Defines when and where the rule applies

2. **Markdown Content** (below the frontmatter)
   - The actual rules and guidelines
   - Uses standard markdown syntax

## Structure of `.mdc` Files

```yaml
---
name: Rule Name # Human-readable name
description: Brief description # What this rule covers
globs: ["**/*.ts", "**/*.tsx"] # File patterns (when to apply)
alwaysApply: true/false # Always include or only when relevant
---
# Rule Content (Markdown)

Your rules and guidelines go here...
```

## What Changed?

### BEFORE: Single `.cursorrules` File (193 lines)

```
.cursorrules (single file)
├── All rules mixed together
├── No metadata or scoping
├── Applied to everything always
└── Hard to maintain and organize
```

### AFTER: Organized `.cursor/rules/` Directory (8 focused files)

```
.cursor/rules/
├── README.md                      # Documentation
├── service-architecture.mdc       # Service patterns
├── backend-logging.mdc            # Backend logging rules
├── frontend-logging.mdc           # Frontend logging rules
├── typescript-style.mdc           # TypeScript standards
├── api-design.mdc                 # API design patterns
├── testing.mdc                    # Testing standards
├── file-organization.mdc          # File naming/structure
└── security-performance.mdc     # Security & performance
```

## Key Changes Explained

### 1. **YAML Frontmatter Added**

Each rule file now has metadata:

```yaml
---
name: Backend Logging
description: Use centralized logger utility for all backend logging
globs: ["apps/api/src/**/*.ts"] # Only applies to backend TypeScript files
alwaysApply: false # Only when working with matching files
---
```

**Benefits:**

- Rules only load when relevant (better performance)
- Clear scoping (backend rules don't apply to frontend)
- Better organization

### 2. **Scoped Rules with Glob Patterns**

**Before:** All rules applied to everything

```markdown
# Rules applied to ALL files, always
```

**After:** Rules scoped to specific file types

```yaml
# Backend logging - only for API files
globs: ["apps/api/src/**/*.ts"]

# Frontend logging - only for web files
globs: ["apps/web/**/*.tsx", "apps/web/**/*.ts"]

# Testing - only for test files
globs: ["**/*.test.ts", "**/__tests__/**/*"]
```

**Benefits:**

- Backend logging rules don't interfere with frontend code
- Test rules only appear when writing tests
- More relevant context for AI

### 3. **Split into Focused Files**

**Before:** One large file with everything

- 193 lines covering all topics
- Hard to find specific rules
- All rules loaded always

**After:** 8 focused files

- Each file under 100 lines
- Easy to find specific rules
- Only relevant rules loaded

### 4. **alwaysApply Flag**

```yaml
# Global rules (always included)
alwaysApply: true
- typescript-style.mdc
- file-organization.mdc
- security-performance.mdc

# Context-specific rules (only when relevant)
alwaysApply: false
- backend-logging.mdc (only for backend files)
- frontend-logging.mdc (only for frontend files)
- testing.mdc (only for test files)
```

**Benefits:**

- Reduces token usage (only relevant rules loaded)
- Faster AI responses
- More focused context

## Example: How It Works

### Scenario 1: Editing Backend Service File

When you edit `apps/api/src/services/auth.service.ts`:

**Rules Loaded:**

- ✅ `service-architecture.mdc` (matches `apps/api/src/services/**/*.ts`)
- ✅ `backend-logging.mdc` (matches `apps/api/src/**/*.ts`)
- ✅ `typescript-style.mdc` (alwaysApply: true)
- ✅ `file-organization.mdc` (alwaysApply: true)
- ✅ `security-performance.mdc` (alwaysApply: true)
- ❌ `frontend-logging.mdc` (doesn't match)
- ❌ `testing.mdc` (not a test file)

### Scenario 2: Editing Frontend Component

When you edit `apps/web/app/register/page.tsx`:

**Rules Loaded:**

- ✅ `frontend-logging.mdc` (matches `apps/web/**/*.tsx`)
- ✅ `typescript-style.mdc` (alwaysApply: true)
- ✅ `file-organization.mdc` (alwaysApply: true)
- ✅ `security-performance.mdc` (alwaysApply: true)
- ❌ `backend-logging.mdc` (doesn't match)
- ❌ `service-architecture.mdc` (doesn't match)

### Scenario 3: Writing Tests

When you edit `apps/api/src/services/auth.service.test.ts`:

**Rules Loaded:**

- ✅ `testing.mdc` (matches `**/*.test.ts`)
- ✅ `backend-logging.mdc` (matches `apps/api/src/**/*.ts`)
- ✅ `typescript-style.mdc` (alwaysApply: true)
- ✅ All other alwaysApply rules

## Benefits Summary

1. **Better Performance**
   - Only relevant rules loaded
   - Faster AI responses
   - Lower token usage

2. **Better Organization**
   - Easy to find specific rules
   - Clear separation of concerns
   - Easier to maintain

3. **Better Context**
   - AI gets more relevant rules
   - Less noise from unrelated rules
   - More accurate suggestions

4. **Future-Proof**
   - Follows Cursor's recommended format
   - `.cursorrules` is deprecated
   - Better version control support

## Migration Details

- **Old file:** `.cursorrules` (kept for backward compatibility, marked as deprecated)
- **New location:** `.cursor/rules/*.mdc`
- **Total rules:** 8 focused files
- **Total lines:** 459 lines (split from 193-line single file)
- **Format:** YAML frontmatter + Markdown content

## File Breakdown

| File                       | Lines | Scope                  | Always Apply |
| -------------------------- | ----- | ---------------------- | ------------ |
| `service-architecture.mdc` | ~50   | Backend services       | No           |
| `backend-logging.mdc`      | ~65   | Backend files          | No           |
| `frontend-logging.mdc`     | ~55   | Frontend files         | No           |
| `typescript-style.mdc`     | ~60   | All TS/TSX             | Yes          |
| `api-design.mdc`           | ~50   | API routes/controllers | No           |
| `testing.mdc`              | ~50   | Test files             | No           |
| `file-organization.mdc`    | ~70   | All files              | Yes          |
| `security-performance.mdc` | ~60   | All files              | Yes          |

## Next Steps

The migration is complete! Cursor will automatically:

1. Detect the new `.cursor/rules/` directory
2. Load appropriate rules based on file context
3. Apply rules according to glob patterns

You can safely delete `.cursorrules` if you want, but it's kept for now with a deprecation notice.
