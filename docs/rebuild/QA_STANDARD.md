# Gameplay QA

Use Light, Full, or Swarm QA. The main integrator alone accepts and repairs; testers are read-only. Full/Swarm proves real-pointer golden path, negative cases, four cardinal views, animation, persistence, foreground smoke, performance, and exact retests.

Simultaneous testers require separate browser profiles or isolated contexts. `?qaProfile=<id>` protects disposable saves but does not make same-context concurrency safe. Never run two smoke sessions in one profile. Use `templates/GAMEPLAY_QA_REPORT_TEMPLATE.md`; human alpha remains required.
