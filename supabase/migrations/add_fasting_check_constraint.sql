-- Impede jejum start === end no nivel do banco
-- Idempotente: nao falha se constraint ja existir

-- Corrigir dados invalidos primeiro (fallback para end=12)
UPDATE users
SET fasting_end_hour = 12
WHERE fasting_start_hour = fasting_end_hour;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'fasting_hours_different'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fasting_hours_different CHECK (fasting_start_hour <> fasting_end_hour);
  END IF;
END $$;
