-- Inicializa el catálogo si las tablas se crearon sin ejecutar los datos iniciales.
-- ON CONFLICT conserva cualquier configuración o registro ya existente.

insert into public.horario_atencion (id, hora_apertura, hora_cierre)
values (1, '10:00', '23:00')
on conflict (id) do nothing;

insert into public.configuracion (id)
values (1)
on conflict (id) do nothing;

insert into public.recursos (nombre, tipo, capacidad) values
  ('Mesa 1', 'MESA_NORMAL', 6),
  ('Mesa 2', 'MESA_NORMAL', 6),
  ('Mesa 3', 'MESA_NORMAL', 6),
  ('Mesa VIP 1', 'MESA_VIP', 8),
  ('Mesa VIP 2', 'MESA_VIP', 8),
  ('Sala 1', 'SALA_MINICINE', 8),
  ('Sala 2', 'SALA_MINICINE', 12)
on conflict (nombre) do nothing;

insert into public.tarifas (tipo, precio_hora) values
  ('MESA_NORMAL', 30),
  ('MESA_VIP', 50),
  ('SALA_MINICINE', 60)
on conflict (tipo) do nothing;

insert into public.peliculas (titulo, duracion_min) values
  ('Dune: Parte Dos', 166),
  ('Intensa-Mente 2', 96),
  ('Oppenheimer', 180),
  ('Spider-Man: A través del Spider-Verso', 140),
  ('Coco', 105)
on conflict (titulo) do nothing;

insert into public.productos (nombre, precio, existencias) values
  ('Pipocas grandes', 25, 50),
  ('Pipocas medianas', 18, 50),
  ('Gaseosa', 10, 80),
  ('Agua', 6, 60),
  ('Nachos', 22, 30),
  ('Hot dog', 20, 30),
  ('Chocolate', 8, 40),
  ('Cerveza', 15, 48)
on conflict (nombre) do nothing;
