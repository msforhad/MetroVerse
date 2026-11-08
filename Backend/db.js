
import pg from 'pg';

const {
  PGUSER,
  PGPASSWORD,
  PGHOST,
  PGPORT,
  PGDATABASE,
} = process.env;

export const pool = new pg.Pool({
  user: PGUSER,
  password: PGPASSWORD,
  host: PGHOST,
  port: Number(PGPORT),
  database: PGDATABASE,
  max: 10,
  idleTimeoutMillis: 30_000,
});

