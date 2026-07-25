-- Categorías por defecto para nuevos usuarios
-- Se ejecuta una vez tras crear la cuenta, o manualmente:

INSERT OR IGNORE INTO categories (id, user_id, name, type, is_default, created_at) VALUES
  ('cat-alimentacion', :userId, 'Alimentación', 'expense', 1, :now),
  ('cat-transporte', :userId, 'Transporte', 'expense', 1, :now),
  ('cat-vivienda', :userId, 'Vivienda', 'expense', 1, :now),
  ('cat-salud', :userId, 'Salud', 'expense', 1, :now),
  ('cat-educacion', :userId, 'Educación', 'expense', 1, :now),
  ('cat-entretencion', :userId, 'Entretención', 'expense', 1, :now),
  ('cat-ropa', :userId, 'Ropa', 'expense', 1, :now),
  ('cat-tecnologia', :userId, 'Tecnología', 'expense', 1, :now),
  ('cat-servicios', :userId, 'Servicios', 'expense', 1, :now),
  ('cat-deudas', :userId, 'Deudas', 'expense', 1, :now),
  ('cat-otros-gasto', :userId, 'Otros', 'expense', 1, :now),
  ('cat-sueldo', :userId, 'Sueldo', 'income', 1, :now),
  ('cat-freelance', :userId, 'Freelance', 'income', 1, :now),
  ('cat-inversiones', :userId, 'Inversiones', 'income', 1, :now),
  ('cat-regalo', :userId, 'Regalo', 'income', 1, :now),
  ('cat-otros-ingreso', :userId, 'Otros ingresos', 'income', 1, :now);
