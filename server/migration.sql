BEGIN;
CREATE TABLE IF NOT EXISTS aula_student_access (
 student_id integer PRIMARY KEY REFERENCES alumnos(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS aula_submissions (
 student_id integer REFERENCES alumnos(id) ON DELETE CASCADE,
 lesson_id integer REFERENCES lecciones(id) ON DELETE CASCADE,
 answers jsonb NOT NULL DEFAULT '{}',
 score integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(student_id,lesson_id)
);
COMMIT;
