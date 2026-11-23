# Royalty House Reservas

Construye un MVP funcional de una aplicación web responsive en español llamada "Royalty House" para gestionar reservas de mesas de billar (normales y VIP) y salas de minicine, con candy bar. Stack: React + TypeScript + Tailwind + shadcn/ui, con Supabase como backend (PostgreSQL, Auth con Google, RLS y funciones RPC). Zona horaria del negocio: America/La_Paz (UTC-4). Moneda: Bs.

## 1. Alcance
DENTRO: login con Google; roles Cliente, Recepcionista y Administrador; consulta de disponibilidad en grilla; reserva de billar y minicine; confirmación en pantalla con código único; cancelación; reservas en mostrador; entrada y salida como cambios de estado; candy bar (catálogo, stock, pedido previo y consumos); administración (mesas, salas, tarifas, películas, productos, horario, lista blanca de personal); reportes de ocupación e ingresos estimados.
FUERA (no los construyas): pagos en línea, registro de cobros o métodos de pago, facturación, impresión de comprobantes, app nativa, notificaciones por correo/WhatsApp/SMS, sugerencia automática de horarios alternativos, tiempo adicional automático y marcado automático de "no presentada". El pago es en efectivo en el local y NO se registra: solo se muestra como aviso en la confirmación.

## 2. Roles y acceso
- Clientes: inician sesión con Google. Cualquier correo que no esté en la lista blanca es CLIENTE.
- Personal: su correo debe estar en la tabla lista_blanca con su rol (RECEPCIONISTA o ADMINISTRADOR), administrada por el administrador. Un trigger en el alta de usuario asigna el rol según esa lista. Sin contraseñas propias.
- Los roles se guardan en una tabla user_roles separada (NUNCA en profiles) y se consultan con una función SECURITY DEFINER has_role(uid, role) para evitar recursión en RLS.
- Primer ingreso de un cliente: pantalla para pedir teléfono y aceptar el tratamiento de datos (checkbox obligatorio) antes de poder reservar.
- Rutas protegidas por rol: /cliente/, /recepcion/, /admin/*. Tras el login, redirige según el rol. El administrador puede entrar también a las pantallas de recepción.

## 3. Reglas de negocio (aplícalas en la base de datos, no solo en la interfaz)
- RN 01/02: un recurso solo se reserva si está libre; no puede haber reservas superpuestas del mismo recurso.
- RN 03: solo se pueden elegir horarios libres; los ocupados se muestran deshabilitados.
- RN 04: reserva de billar = mesa (que define modalidad normal o VIP), hora y duración (1 a 4 bloques).
- RN 05: reserva de minicine = sala + película + hora. Se elige primero la película; sus bloques = ceil(duración_min / 60).
- RN 06: el candy bar solo se asocia a reservas de minicine.
- RN 07: el stock se descuenta al REGISTRAR EL CONSUMO (recepción), no al reservar. No se puede consumir sin existencias.
- RN 08: el pago es en efectivo en el local y no se registra.
- RN 09: para reservar hay que haber aceptado el tratamiento de datos.
- RN 10: el cliente cancela hasta 2 horas antes del inicio (valor en tabla configuracion). La recepcionista puede marcar "no presentada" pasados 15 minutos de tolerancia (configurable).
- RN 11: máximo 2 reservas activas (CONFIRMADA y futuras) por cliente (configurable).
Modelo de tiempo: bloques fijos de 1 hora; bloque = hora de inicio (14 = 14:00-15:00). La duración de una reserva es un número de bloques consecutivos. Solo hay bloques dentro del horario de atención. No se pueden reservar horas pasadas.

## 4. Modelo de datos (crea migraciones SQL con esto)
```sql
create type app_role as enum ('CLIENTE','RECEPCIONISTA','ADMINISTRADOR');
create type tipo_recurso as enum ('MESA_NORMAL','MESA_VIP','SALA_MINICINE');
create type estado_reserva as enum ('CONFIRMADA','EN_USO','FINALIZADA','CANCELADA','NO_PRESENTADA');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  correo text not null unique,
  telefono text,
  acepto_datos boolean not null default false,
  created_at timestamptz not null default now()
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

create table lista_blanca (
  correo text primary key,
  rol app_role not null check (rol in ('RECEPCIONISTA','ADMINISTRADOR')),
  created_at timestamptz not null default now()
);

create table recursos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo tipo_recurso not null,
  capacidad int not null check (capacidad > 0),
  activo boolean not null default true
);

create table tarifas (
  tipo tipo_recurso primary key,
  precio_hora numeric(10,2) not null check (precio_hora >= 0)
);

create table horario_atencion (
  id int primary key default 1 check (id = 1),
  hora_apertura time not null,
  hora_cierre time not null check (hora_cierre > hora_apertura)
);

create table configuracion (
  id int primary key default 1 check (id = 1),
  horas_min_cancelacion int not null default 2,
  minutos_tolerancia int not null default 15,
  max_reservas_activas int not null default 2,
  max_bloques_billar int not null default 4
);

create table peliculas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null unique,
  duracion_min int not null check (duracion_min > 0),
  en_cartelera boolean not null default true
);

create table reservas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,                       -- 8 caracteres alfanuméricos
  usuario_id uuid references auth.users(id) on delete set null, -- null si es de mostrador sin cuenta
  nombre_cliente text not null,
  telefono_cliente text not null,
  recurso_id uuid not null references recursos(id),
  pelicula_id uuid references peliculas(id),         -- solo minicine
  fecha date not null,
  hora_inicio time not null,
  bloques int not null check (bloques between 1 and 8),
  estado estado_reserva not null default 'CONFIRMADA',
  hora_entrada timestamptz,
  hora_salida timestamptz,
  creada_por uuid references auth.users(id),
  creada_en timestamptz not null default now(),
  unique (id, recurso_id, fecha)
);

-- Impide superposiciones aunque dos personas reserven a la vez (RN 02)
create table reserva_bloques (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null,
  recurso_id uuid not null references recursos(id),
  fecha date not null,
  bloque int not null check (bloque between 0 and 23),
  constraint uq_recurso_fecha_bloque unique (recurso_id, fecha, bloque),
  constraint fk_bloque_reserva foreign key (reserva_id, recurso_id, fecha)
    references reservas(id, recurso_id, fecha) on delete cascade
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  precio numeric(10,2) not null check (precio >= 0),
  existencias int not null default 0 check (existencias >= 0),
  activo boolean not null default true
);

-- Pedido previo del cliente (NO descuenta stock)
create table pedido_candy (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references reservas(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad int not null check (cantidad > 0)
);

-- Consumo real registrado por recepción (SÍ descuenta stock)
create table consumos (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references reservas(id),
  producto_id uuid not null references productos(id),
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  fecha timestamptz not null default now(),
  registrado_por uuid references auth.users(id)
);

create index on reservas (usuario_id, estado);
create index on reservas (fecha);
create index on consumos (reserva_id);
```

Además:
- Trigger on auth.users (SECURITY DEFINER): crea la fila en profiles; si el correo está en lista_blanca asigna ese rol, y si no asigna CLIENTE.
- RLS activado en TODAS las tablas. Políticas: el cliente lee y gestiona solo sus profiles, sus reservas, sus pedido_candy y sus consumos (lectura); recursos, tarifas, películas en cartelera, productos activos, horario y configuracion son legibles por cualquier usuario autenticado; recepción lee todas las reservas y consumos; solo ADMINISTRADOR escribe en recursos, tarifas, horario_atencion, configuracion, peliculas, productos (alta y edición) y lista_blanca; user_roles solo lectura propia. Las escrituras de reservas, bloques y consumos se hacen SOLO mediante las funciones RPC de abajo (sin políticas de insert/update directas para clientes).

## 5. Funciones RPC (PostgreSQL, SECURITY DEFINER, validan auth.uid() y rol)
- obtener_ocupacion(p_fecha date, p_tipo tipo_recurso[]) → devuelve (recurso_id, bloque) de los bloques ocupados. Es la única forma de que el cliente vea la ocupación sin leer reservas ajenas.
- crear_reserva(p_recurso_id, p_fecha, p_hora_inicio, p_bloques, p_pelicula_id, p_nombre_cliente, p_telefono_cliente, p_productos jsonb) → crea la reserva. Valida: usuario autenticado; si es cliente, usa su propio id y sus datos, tiene acepto_datos = true y no supera el máximo de reservas activas (RN 11); no es una hora pasada; está dentro del horario de atención; billar: 1 a max_bloques_billar; minicine: exige película y bloques = ceil(duracion/60) y solo entonces acepta p_productos (RN 06, guardados en pedido_candy sin tocar stock); recepción puede crear con nombre y teléfono sin cuenta (usuario_id null). Genera el código de 8 caracteres, inserta la reserva y sus bloques. Si salta unique_violation, lanza el error 'HORARIO_OCUPADO'.
- cancelar_reserva(p_id) → el cliente solo la suya y con al menos horas_min_cancelacion de anticipación (si no, error 'FUERA_DE_PLAZO'); recepción puede cancelar cualquiera. Pasa a CANCELADA y borra sus bloques.
- cambiar_estado_reserva(p_id, p_estado) → solo recepción o administrador. Transiciones válidas: CONFIRMADA→EN_USO (guarda hora_entrada), EN_USO→FINALIZADA (guarda hora_salida), CONFIRMADA→NO_PRESENTADA (solo si pasó la tolerancia). Al pasar a FINALIZADA o NO_PRESENTADA se borran los bloques para liberar el recurso.
- registrar_consumo(p_reserva_id, p_producto_id, p_cantidad) → solo recepción o administrador, solo en reservas de minicine EN_USO. Bloquea la fila del producto (FOR UPDATE), verifica existencias (si no hay, error 'SIN_STOCK'), inserta el consumo con el precio vigente y descuenta el stock en la misma transacción.
- reporte_resumen(p_desde date, p_hasta date) → solo administrador. Devuelve: % de ocupación (bloques de reservas EN_USO y FINALIZADA ÷ (recursos activos × bloques de atención por día × días)), ocupación por tipo de recurso, e ingresos estimados = Σ(tarifa.precio_hora × bloques de reservas FINALIZADAS) + Σ(consumos.cantidad × precio_unitario), desglosados por día.

## 6. Datos iniciales (seed)
Horario 10:00-23:00; configuracion por defecto; 3 mesas normales (Mesa 1 a 3, capacidad 6), 2 mesas VIP (Mesa VIP 1 y 2, capacidad 8), 2 salas (Sala 1 de 8 y Sala 2 de 12); tarifas: normal Bs 30, VIP Bs 50, minicine Bs 60 por hora; 5 películas con su duración real; 8 productos con stock (pipocas grandes y medianas, gaseosa, agua, nachos, hot dog, chocolate, cerveza). En lista_blanca agrega antoniomir534@gmail.com como ADMINISTRADOR para poder entrar como administrador desde el primer día.

## 7. Pantallas
Cliente:
1. Landing + botón "Ingresar con Google".
2. Completar perfil (teléfono + aceptación de datos).
3. Nueva reserva: elegir servicio (billar / minicine), fecha (no pasadas) y, en minicine, la película. Grilla por recurso (mesas normales, mesas VIP o salas) con los bloques de la jornada: libres seleccionables y ocupados deshabilitados. Para billar, elige duración (1-4 h). Si no hay horarios libres ese día, lo indica.
4. Resumen: recurso y modalidad o película, fecha, hora, duración, pedido opcional de candy bar (solo minicine) y costo estimado (tarifa × horas + productos). Botón Confirmar.
5. Confirmación: código grande y destacado, detalles, aviso "El pago se realiza en efectivo en el local". Si el servidor responde HORARIO_OCUPADO, mostrar aviso, refrescar la grilla y dejar elegir otro horario.
6. Mis reservas: lista con estado y botón Cancelar (deshabilitado con explicación si falta menos del plazo).
Recepcionista:
7. Panel del día: reservas de hoy por recurso y estado; buscar por código o nombre; botones Registrar entrada, Registrar salida y Marcar no presentada (solo tras la tolerancia).
8. Reserva en mostrador: misma grilla que el cliente, más nombre y teléfono del cliente.
9. Detalle de reserva de minicine: ver el pedido previo, registrar consumos (muestra existencias, bloquea si no hay stock).
Administrador:
10. CRUD de recursos, tarifas, horario de atención, configuración (plazo de cancelación, tolerancia, máximo de reservas), películas, productos y stock.
11. Gestión de personal: agregar o quitar correos en la lista blanca con su rol.
12. Reportes: rango de fechas, % de ocupación, ingresos estimados por día y por tipo de recurso, con un gráfico simple y una tabla.

## 8. Calidad y criterios de aceptación
- Diseño limpio, moderno y responsive (móvil primero). Textos y mensajes de error en español, claros.
- Dos clientes que intentan reservar el mismo bloque a la vez: solo uno lo logra; el otro recibe "El horario fue ocupado" y la grilla se actualiza.
- Un cliente con 2 reservas activas no puede crear una tercera.
- Un cliente no puede cancelar con menos de 2 horas de anticipación.
- Reservar minicine con productos NO cambia el stock; registrar el consumo en recepción SÍ lo cambia y bloquea si no hay existencias.
- Un cliente no puede ver reservas ajenas ni entrar a /recepcion o /admin; un correo fuera de la lista blanca nunca obtiene rol de personal.
- No existe ninguna pantalla ni campo de pago, método de pago ni comprobante.

## 9. Orden de construcción
Hazlo por fases y verifica cada una antes de la siguiente: (1) esquema, RLS, trigger de roles, funciones y seed; (2) login con Google, perfil y rutas por rol; (3) flujo del cliente (grilla, reserva, confirmación, mis reservas, cancelación); (4) recepción; (5) administración y reportes. Si algo del enunciado es ambiguo, toma la opción más simple, indícalo en una línea y continúa.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c7025b61-a3e6-4de1-90a9-ef48bf076050).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
