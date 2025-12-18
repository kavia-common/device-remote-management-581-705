# device-remote-management-581-705

This repository contains multiple containers for a device management platform.

DatabaseContainer:
- PostgreSQL schema with RLS and indexes
- Migrations executed one statement at a time via psql -c
- To initialize:
  1) Start DB with DatabaseContainer/startup.sh (local helper)
  2) cd DatabaseContainer && ./migrate.sh up

FrontendContainer:
- React + TypeScript (Vite)
- See FrontendContainer/README.md for usage