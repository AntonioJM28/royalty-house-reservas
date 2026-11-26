# Royalty House Reservas

Aplicación web responsive en español para gestionar reservas de mesas de billar normales y VIP, salas de minicine y pedidos de candy bar. El proyecto usa Supabase como backend y mantiene el negocio alineado con la zona horaria de La Paz (America/La_Paz, UTC-4) y la moneda boliviana (Bs).

## Funcionalidades

### Clientes

- Inicio de sesión mediante Google.
- Completar teléfono y aceptar el tratamiento de datos antes de reservar.
- Reservar una mesa de billar normal o VIP por bloques de una hora, con una duración de 1 a 4 horas.
- Elegir una sala de minicine y una película. La duración se calcula a partir de la duración de la película y se expresa en bloques consecutivos.
- Indicar entre 1 y 7 asistentes para minicine.
- Consultar horarios libres y ocupados, con bloqueo visual de los bloques no disponibles.
- Agregar productos opcionales al pedido de candy bar de una reserva de minicine.
- Confirmar la reserva y mostrar su código de 8 caracteres, detalles y aviso de pago en efectivo en el local.
- Consultar y cancelar reservas propias dentro del plazo configurable.

### Recepción

- Consultar las reservas del día y buscar por código o nombre.
- Registrar reservas en mostrador con datos manuales de nombre y teléfono.
- Cambiar estados entre confirmada, en uso, finalizada y no presentada.
- Registrar entradas y salidas.
- Consultar el pedido previo de candy bar y registrar consumos reales durante una función.
- Descontar existencias únicamente cuando recepción registra el consumo.

### Administración

- La navegación por rol reconoce al administrador y permite conservar acceso a las pantallas de recepción.
- La ruta `/admin` contiene la estructura base de la sección administrativa; el catálogo, personal y reportes tienen su correspondiente capa de datos y permisos en Supabase.

## Tecnologías

- **React 19** y **TypeScript**: interfaz y tipado de componentes.
- **TanStack Start** y **TanStack Router**: aplicación full-stack, renderizado, rutas por archivos y protección de navegación.
- **TanStack React Query**: caché, refresco y sincronización de consultas.
- **Vite**: servidor de desarrollo y construcción.
- **Tailwind CSS 4** y **shadcn/ui**: estilos responsive y componentes de interfaz.
- **Supabase**: PostgreSQL, autenticación con Google, RLS, roles y funciones RPC.
- **Drizzle**: esquema de referencia y organización de migraciones.
- **Zod** y **React Hook Form**: validación y formularios donde corresponda.
- **date-fns**, **Recharts**, **Sonner** y **Lucide React**: utilidades de fechas, gráficos, mensajes y iconos.
- **Vitest**, **Testing Library** y **jsdom**: pruebas unitarias y de rutas.

## Arquitectura y lógica

La aplicación mantiene las reglas sensibles en PostgreSQL y las utiliza mediante funciones RPC de Supabase. Las acciones de reserva, cancelación, cambio de estado y registro de consumo no dependen solamente de validaciones de la interfaz.

### Modelo de reserva

- Un bloque representa una hora fija: por ejemplo, el bloque 14 corresponde de 14:00 a 15:00.
- `reserva_bloques` conserva cada bloque ocupado por recurso y fecha. Su restricción única evita que dos reservas concurrentes ocupen el mismo recurso, fecha y bloque.
- Los horarios pasados no son seleccionables y la grilla deshabilita bloques ocupados o incompletos.
- La reserva de billar utiliza 1 a `max_bloques_billar` bloques configurables.
- La reserva de minicine calcula los bloques con `ceil(duracion_min / 60)` y registra hasta 7 personas.
- El costo estimado combina la tarifa del recurso y los productos seleccionados.

### Roles y perfil

- Los roles se guardan en `user_roles`, nunca dentro de `profiles`.
- `lista_blanca` identifica los correos de recepción y administración.
- Un trigger sobre `auth.users` crea el perfil, asigna el rol de personal presente en la lista blanca y deja `CLIENTE` para los demás usuarios.
- La función `has_role()` usa `SECURITY DEFINER` para consultar roles sin recurrir a políticas RLS que puedan entrar en recursión.
- RLS protege las tablas; las lecturas públicas de catálogo están restringidas a información necesaria y las modificaciones críticas pasan por RPC.

### Disponibilidad y concurrencia

- `obtener_ocupacion(p_fecha, p_tipo)` devuelve únicamente recurso y bloque ocupados, sin exponer reservas ajenas.
- `crear_reserva()` valida autenticación, perfil completo, máximo de reservas activas, horario, duración, película, personas y disponibilidad.
- El pedido de candy bar se guarda en `pedido_candy` sin alterar el stock.
- `registrar_consumo()` bloquea el producto, verifica existencias y registra el consumo junto con el descuento de stock dentro de una transacción.
- Los estados y límites de cancelación se validan con las funciones RPC y con el modelo de tiempo de La Paz.

### Zona horaria y cifras

- Las fechas y horas de negocio se gestionan como fecha local en La Paz y el identificador absoluto se calcula con UTC-4.
- El pago es en efectivo en el local y no se guarda como cobro, método de pago ni comprobante.
- Los precios y consumos se representan con valores numéricos y se formatean como pesos bolivianos (`Bs`).

## Rutas

TanStack Router genera el árbol de navegación desde `src/routes`. Los nombres con guion bajo son rutas de layout y no forman segmentos visibles en la URL.

| Ruta | Archivo principal | Acceso y función |
| --- | --- | --- |
| `/` | `src/routes/index.tsx` | Landing e inicio de sesión con Google. Redirige según sesión y rol. |
| `/perfil` | `src/routes/_authenticated/perfil.tsx` | Completa teléfono y consentimiento de datos. |
| `/cliente` | `src/routes/_authenticated/cliente/index.tsx` | Mis reservas del usuario autenticado. |
| `/cliente/nueva` | `src/routes/_authenticated/cliente/nueva.tsx` | Constructor de reservas para billar y minicine. |
| `/cliente/reserva/$id` | `src/routes/_authenticated/cliente/reserva.$id.tsx` | Confirmación y detalle de una reserva. |
| `/recepcion` | `src/routes/_authenticated/recepcion/index.tsx` | Panel diario, búsqueda y acciones de estado. |
| `/recepcion/mostrador` | `src/routes/_authenticated/recepcion/mostrador.tsx` | Reserva de mostrador para clientes sin cuenta. |
| `/recepcion/reserva/$id` | `src/routes/_authenticated/recepcion/reserva.$id.tsx` | Detalle, confirmación, cambios de estado y consumos. |
| `/admin` | `src/routes/_authenticated/admin/index.tsx` | Panel base disponible para administradores. |

### Protección de rutas

- `src/routes/_authenticated/route.tsx` carga la sesión antes de renderizar las rutas protegidas y redirige a `/` si no existe una sesión válida.
- `/cliente` exige perfil completo y redirige al perfil o a recepción según corresponda.
- `/recepcion` exige el rol `RECEPCIONISTA` o `ADMINISTRADOR`.
- `/admin` exige `ADMINISTRADOR`.
- `/` usa el rol y el estado del perfil para elegir el destino inicial:
  `ADMINISTRADOR` → `/admin`, `RECEPCIONISTA` → `/recepcion`, perfil incompleto → `/perfil` y cliente completo → `/cliente`.
- `__root.tsx` contiene el shell global, proveedores, notificaciones y el layout raíz.
- El árbol generado `src/routeTree.gen.ts` se genera automáticamente y no se modifica a mano.

## Base de datos

El esquema y las migraciones viven dentro del repositorio:

- [drizzle/schema.ts](drizzle/schema.ts) contiene el esquema de referencia.
- [drizzle/migrations/](drizzle/migrations) contiene las migraciones SQL numeradas, incluyendo roles, permisos, perfil, reservas, ocupación, funciones auxiliares y cancelación.
- Los datos iniciales incluyen horario de atención, configuración, recursos, tarifas, películas y productos.

Las migraciones deben aplicarse en orden sobre el proyecto propio de Supabase. Las migraciones SQL son la fuente de verdad para tablas, índices, RLS, triggers y RPC.

## Configuración local

Requisitos:

- Node.js y npm.
- Un proyecto propio de Supabase.
- Google OAuth configurado en Supabase Auth.

Instalación:

```sh
npm install
npm run dev
```

La aplicación espera las siguientes variables de entorno públicas de Supabase:

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

Para renderizado o ejecución mediante las variables del servidor, también se pueden definir:

```dotenv
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

No se debe incluir una `service_role` key, clave secreta o credencial de migración en el código del cliente ni en variables `VITE_*`.

## Comandos

```sh
npm run dev       # Servidor de desarrollo
npm run build     # Compilación de producción
npm run preview   # Vista previa de la compilación
npm run lint      # Revisión con ESLint
npm run test       # Pruebas con Vitest
npm run test:watch # Pruebas en modo observación
```

## Validación

Las pruebas cubren utilidades del negocio, disponibilidad de bloques, cancelaciones, cálculos de minicine y protección de rutas por rol. La mayor parte de las reglas críticas se verifican además en Supabase mediante restricciones únicas, RLS y funciones RPC.