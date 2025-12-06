# Cursor Rules

This directory contains Cursor AI rules organized by topic. Each rule file uses the `.mdc` format with YAML frontmatter for metadata.

## Rule Files

- **task-planning.mdc** - Multi-step planning process for complex tasks and clarification requirements
- **service-architecture.mdc** - Functional services pattern, database helpers
- **backend-logging.mdc** - Backend logging with centralized logger utility
- **frontend-logging.mdc** - Frontend console logging with prefixes
- **typescript-style.mdc** - TypeScript coding standards
- **api-design.mdc** - RESTful API design patterns
- **testing.mdc** - Testing standards and patterns
- **file-organization.mdc** - Naming conventions and file structure
- **security-performance.mdc** - Security and performance best practices
- **git-workflow.mdc** - Git workflow and PR requirements

## Rule Metadata

Each rule file includes YAML frontmatter:

```yaml
---
name: Rule Name
description: Brief description
globs: ["**/*.ts", "**/*.tsx"] # File patterns this rule applies to
alwaysApply: true/false # Whether to always include in context
---
```

## Rule Types

- **alwaysApply: true** - Included in every context (e.g., TypeScript style, security)
- **alwaysApply: false** - Applied when files matching globs are referenced (e.g., service files, test files)

## Adding New Rules

1. Create a new `.mdc` file in this directory
2. Add YAML frontmatter with appropriate metadata
3. Keep rules focused and under 500 lines
4. Include concrete examples
5. Use glob patterns to scope rules appropriately

## Best Practices

- Keep rules concise and focused (under 500 lines)
- Use specific, actionable guidelines
- Include code examples (good/bad patterns)
- Use glob patterns to scope rules to relevant files
- Regularly review and update rules as the project evolves
