CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMPTZ,
  DROP COLUMN metadata,
  ALTER COLUMN email TYPE TEXT;

DROP TABLE IF EXISTS old_users CASCADE;

CREATE VIEW active_users AS
SELECT id, email FROM users WHERE deleted_at IS NULL;

-- adversarial: a stored generated column with a long expression
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qty INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  payload JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  CHECK (qty >= 0 AND unit_price >= 0)
);

-- adversarial: CREATE OR REPLACE ... IF NOT EXISTS combinations
CREATE OR REPLACE PROCEDURE p() LANGUAGE SQL AS $$ SELECT 1; $$;
CREATE TABLE IF NOT EXISTS t (id INT);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_t_id ON t (id);

-- adversarial: foreign keys with every action and match clause
ALTER TABLE orders
  ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users (id)
  MATCH FULL ON DELETE CASCADE ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- adversarial: trigger with WHEN clause and procedural body
CREATE TRIGGER audit_ins BEFORE INSERT ON t
FOR EACH ROW WHEN (NEW.qty > 100)
EXECUTE FUNCTION audit_fn();

-- adversarial: partitioning and tablespace
CREATE TABLE measurement (
  city_id INT NOT NULL,
  logdate DATE NOT NULL,
  peaktemp INT,
  unitsales INT
) PARTITION BY RANGE (logdate) TABLESPACE fastdisk;
