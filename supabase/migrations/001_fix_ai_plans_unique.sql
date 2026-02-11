-- LEGADO: Tenta criar constraint 'ai_plans_user_id_key'.
-- Em producao, a constraint ativa e 'ai_plans_user_id_unique'.
-- Idempotente: nao falha se qualquer UNIQUE em user_id ja existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ai_plans' AND constraint_type = 'UNIQUE'
  ) THEN
    -- Limpar duplicatas
    DELETE FROM ai_plans a USING ai_plans b
    WHERE a.user_id = b.user_id AND a.created_at < b.created_at;
    -- Adicionar constraint
    ALTER TABLE ai_plans ADD CONSTRAINT ai_plans_user_id_key UNIQUE (user_id);
  END IF;
END $$;
