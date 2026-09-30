-- =============================================================================
-- Endurecimiento: la aplicación usa la API REST (PostgREST) y no GraphQL.
-- Desactivar pg_graphql reduce la superficie de ataque y evita que las tablas
-- queden expuestas en el esquema GraphQL (advisor: pg_graphql_authenticated_table_exposed).
-- Para reactivarlo: `create extension pg_graphql;`
-- =============================================================================
drop extension if exists pg_graphql;
