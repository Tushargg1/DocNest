# Development Workflow Rules

## Execution Behavior

- Continue tasks sequentially without stopping
- Automatically proceed to the next task after completion
- Fix build/runtime/lint issues automatically
- Do not ask for confirmation after each step
- Only stop for critical architectural or security decisions

## Coding Rules

- Use modular architecture
- Keep code production-ready
- Add proper error handling
- Maintain clean folder structure
- Follow existing project conventions (Spring Boot backend, React frontend)
- Use Tailwind utility classes consistent with the project's minimal design system
- No emojis in UI — use text labels or SVG icons
- Keep the color palette minimal: slate/gray + teal accent only

## Workflow

1. Read TASKS.md
2. Complete tasks in order
3. Mark completed tasks
4. Continue automatically until all tasks are finished

## Terminal Permissions

- Safe commands may be executed automatically
- Retry failed commands when reasonable
- Kill and restart servers when port conflicts occur
- Run `mvn compile` to verify backend changes
- Check diagnostics after frontend edits

## Project Context

- Backend: Java 17, Spring Boot 3.4, Maven, MySQL 8
- Frontend: React 19, Vite 8, Tailwind CSS 4
- Auth: JWT stateless, role-based (PATIENT, DOCTOR, CLINIC, ADMIN)
- API base: `http://localhost:8085/api`
- Frontend dev: `http://localhost:5173`
- Test accounts seeded on startup (password: password123)
