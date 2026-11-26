# Migraciones SQL

Las migraciones describen la evolución del esquema de PostgreSQL usado por el proyecto. Incluyen tablas, restricciones, índices, roles, permisos, políticas RLS, triggers, datos iniciales y funciones RPC de Supabase.

## Historial

Hay dos archivos con prefijo `0004`; son migraciones distintas. Para una base nueva, el orden recomendado es el siguiente:

| Orden | Archivo | Propósito |
| --- | --- | --- |
| 1 | [`0000_migration.sql`](../drizzle/migrations/0000_migration.sql) | Crea enums, tablas principales, restricciones, índices, grants, políticas RLS y funciones iniciales. Incluye la lógica base de reservas, cambios de estado, consumos, reportes y datos semilla. |
| 2 | [`0001_migration.sql`](../drizzle/migrations/0001_migration.sql) | Sincroniza los roles de `user_roles` cuando se agrega, edita o elimina una entrada de `lista_blanca`. |
| 3 | [`0002_configuracion_lectura_con_sesion.sql`](../drizzle/migrations/0002_configuracion_lectura_con_sesion.sql) | Limita la lectura de `configuracion` a usuarios autenticados. |
| 4 | [`0003_reservas_personas_minicine.sql`](../drizzle/migrations/0003_reservas_personas_minicine.sql) | Añade asistentes a reservas y actualiza `crear_reserva` para validar minicine, personas, horarios y pedidos. |
| 5 | [`0004_perfil_google.sql`](../drizzle/migrations/0004_perfil_google.sql) | Crea/actualiza perfiles al iniciar con OAuth, asigna el rol desde la lista blanca y agrega la RPC para completar el perfil. |
| 6 | [`0004_reporte_minicine_por_persona.sql`](../drizzle/migrations/0004_reporte_minicine_por_persona.sql) | Calcula ingresos de minicine por cantidad de personas y actualiza el reporte de ocupación/ingresos. |
| 7 | [`0005_permisos_roles.sql`](../drizzle/migrations/0005_permisos_roles.sql) | Refuerza la política para que cada cuenta autenticada lea únicamente sus propios roles. |
| 8 | [`0006_permisos_catalogo.sql`](../drizzle/migrations/0006_permisos_catalogo.sql) | Ajusta permisos de lectura del catálogo para usuarios con sesión y mantiene el acceso de personal a películas/productos no públicos. |
| 9 | [`0007_datos_iniciales.sql`](../drizzle/migrations/0007_datos_iniciales.sql) | Inserta horario, configuración, recursos, tarifas, películas y productos iniciales sin duplicar los ya existentes. |
| 10 | [`0008_obtener_ocupacion.sql`](../drizzle/migrations/0008_obtener_ocupacion.sql) | Define la RPC que devuelve recursos y bloques ocupados para la fecha seleccionada. |
| 11 | [`0009_funciones_auxiliares_reserva.sql`](../drizzle/migrations/0009_funciones_auxiliares_reserva.sql) | Define funciones auxiliares para hora local de La Paz y códigos de reserva. |
| 12 | [`0010_permisos_reservas.sql`](../drizzle/migrations/0010_permisos_reservas.sql) | Establece la política de lectura de reservas propias o visibles para personal. |
| 13 | [`0011_cancelar_reserva.sql`](../drizzle/migrations/0011_cancelar_reserva.sql) | Define la cancelación, valida propietario/estado/plazo y libera bloques ocupados. |
| 14 | [`0012_permisos_escritura_admin.sql`](../drizzle/migrations/0012_permisos_escritura_admin.sql) | Reestablece grants de escritura y políticas RLS administrativas en el catálogo, reglas y lista blanca. |
| 15 | [`0013_lectura_detalle_reservas.sql`](../drizzle/migrations/0013_lectura_detalle_reservas.sql) | Otorga lectura de pedidos y consumos, respetando las políticas de propietario o personal. |
| 16 | [`0014_reparar_cambiar_estado_reserva.sql`](../drizzle/migrations/0014_reparar_cambiar_estado_reserva.sql) | Recrea la RPC de cambio de estado con argumentos `p_id` y `p_estado`, y recarga la caché de PostgREST. |
| 17 | [`0015_reparar_reporte_resumen.sql`](../drizzle/migrations/0015_reparar_reporte_resumen.sql) | Recrea la RPC de reportes con `p_desde` y `p_hasta`, conserva el cálculo por persona y recarga PostgREST. |

## Aplicación en Supabase

1. Confirma que el proyecto y la base seleccionados son los correctos.
2. Si la base ya contiene datos, identifica primero cuáles scripts están aplicados. No ejecutes `0000_migration.sql` sobre tablas que ya existen.
3. Revisa cada script antes de ejecutarlo; las migraciones posteriores dependen de las anteriores.
4. Ejecuta los scripts pendientes en el orden de la tabla, por ejemplo desde el SQL Editor de Supabase.
5. Revisa el resultado de cada ejecución antes de continuar. `NOTIFY pgrst, 'reload schema'` pide a PostgREST actualizar su caché para las RPC.
6. Después de migrar, valida inicio de sesión, carga de catálogo, creación de reserva, registro de entrada/salida y reportes con los roles correspondientes.

Los scripts `0012` a `0015` son correcciones acumuladas para permisos, lecturas y RPC del proyecto. No se debe asumir que una migración está pendiente solo por su número; verifica el historial real de la base.

## Drizzle y el historial de migraciones

`drizzle.config.ts` lee `DATABASE_URL` y `drizzle/schema.ts` es una referencia generada que actualmente está vacía. El repositorio no define un script `db:migrate` en `package.json`, y `drizzle/migrations/meta/_journal.json` puede no reflejar todos los archivos SQL actuales. Por eso, no uses el journal como prueba única de qué se aplicó ni ejecutes un comando automático a ciegas: usa el SQL versionado y verifica el estado de tu base antes de aplicar cambios.

No guardes la URL PostgreSQL, claves `service_role` ni otras credenciales en Git, código del navegador o variables `VITE_*`.
