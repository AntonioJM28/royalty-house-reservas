# Lógica básica de la aplicación

Royalty House Reservas permite que clientes reserven billar o minicine, que recepción administre reservas y consumos, y que administración mantenga el catálogo y las reglas del negocio. La interfaz está implementada con React/TanStack; Supabase Auth identifica al usuario y PostgreSQL aplica las reglas críticas.

## Sesión y navegación por rol

1. El usuario inicia sesión con Google desde `/`.
2. Supabase devuelve la sesión OAuth; el cliente conserva la sesión y consulta el usuario autenticado.
3. `cargarSesion()` lee `user_roles` y `profiles`.
4. La aplicación decide el destino según rol y perfil:
   - `ADMINISTRADOR` → `/admin`; también tiene acceso a recepción.
   - `RECEPCIONISTA` → `/recepcion`.
   - Cliente sin perfil completo → `/perfil`.
   - Cliente con perfil completo → `/cliente`.
5. Los layouts protegidos vuelven a verificar sesión y rol. Las rutas no sustituyen la seguridad de RLS ni las validaciones del servidor.

Los roles viven en `user_roles`. `lista_blanca` registra correos autorizados para recepción o administración; un trigger sincroniza esa lista con los roles. Un usuario que no está autorizado como personal recibe el rol `CLIENTE`.

## Reserva del cliente y mostrador

El constructor de reservas consulta el catálogo, las reglas de horario y la ocupación. El usuario elige recurso, fecha, bloque inicial y duración; para minicine también elige película, asistentes y, opcionalmente, productos.

Al confirmar, la interfaz llama a `crear_reserva()` en PostgreSQL. La función vuelve a validar sesión, datos, límites, horarios, película y disponibilidad. La disponibilidad concurrente se protege con restricciones únicas en los bloques, por lo que dos solicitudes para el mismo recurso/bloque no deberían confirmarse ambas.

En mostrador, recepción introduce nombre y teléfono de la persona. La reserva queda registrada por el usuario de recepción (`creada_por`) y sin asociarse a una cuenta cliente (`usuario_id` nulo). En el flujo de cliente, la reserva se asocia a la cuenta autenticada.

El candy bar pedido al reservar queda en `pedido_candy`; no descuenta inventario. Recepción registra el consumo real mediante `registrar_consumo()`, que valida estado, producto y existencias y descuenta stock en la base.

## Estados y reglas

Las reservas pueden pasar por estos flujos principales:

- `CONFIRMADA` → `EN_USO` al registrar entrada.
- `EN_USO` → `FINALIZADA` al registrar salida.
- `CONFIRMADA` → `NO_PRESENTADA` después de la tolerancia configurada.
- `CONFIRMADA` → `CANCELADA` si la solicitud cumple el plazo de cancelación.

Los cambios se ejecutan mediante RPC (`cambiar_estado_reserva`, `cancelar_reserva`). La interfaz muestra acciones según estado, pero la base vuelve a validar autorización y transición.

Los horarios se interpretan en `America/La_Paz` (UTC-4). El billar se reserva en bloques de una hora; el minicine calcula bloques con la duración de la película. Los precios se muestran en bolivianos (Bs) y el pago se realiza en el local.

## Administración

Las rutas `/admin` permiten gestionar recursos, películas, productos, personal, tarifas y reglas. Los reportes consultan `reporte_resumen()` para ocupación e ingresos. Las escrituras directas tienen grants y políticas RLS de administrador; las operaciones de negocio sensibles usan funciones `SECURITY DEFINER` con validación explícita de rol.

## Capas principales

- `src/routes/`: páginas, layouts y protección de rutas.
- `src/components/rh/`: formularios y componentes de negocio reutilizables.
- `src/lib/`: consultas, validaciones, cálculos y reglas del negocio.
- `src/integrations/supabase/`: clientes Supabase y tipos de base de datos.
- `drizzle/migrations/`: esquema ejecutable, políticas, triggers y RPC.
- `src/routeTree.gen.ts`: árbol de rutas generado; no editar manualmente.
