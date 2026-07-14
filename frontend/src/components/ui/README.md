# ui/

Generated shadcn/ui primitives live here (e.g. `button.tsx`, `dialog.tsx`,
`resizable.tsx`). Add them with the shadcn CLI rather than hand-writing them:

```bash
npx shadcn@latest add button dialog resizable tabs
```

Nothing is generated yet — this happens as each phase needs specific primitives
(Phase 2 will need `resizable`, `tabs`, `scroll-area` for the IDE shell; Phase 4
will need `dialog`, `select`, `avatar` for chat, etc.).
