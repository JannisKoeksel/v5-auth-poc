#!/usr/bin/env node
import pgtools from 'pgtools';
import { readFileSync } from 'fs';
import { Client } from 'pg';

const CONFIG = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  password: process.env.PGPASSWORD || "postgres",
};

const DB_NAME = 'auth_poc';
const SQL_FILE = 'v5_auth_poc.sql';

async function main() {
  try {
    // Drop database if exists
    await pgtools.dropdb(CONFIG, DB_NAME);
  } catch {
    // ignore if it didn’t exist
  }
  // Create fresh database
  await pgtools.createdb(CONFIG, DB_NAME);

  // Read schema file
  const sql = readFileSync(SQL_FILE, 'utf-8');

  // Connect to the new DB and run the SQL
  const client = new Client({ ...CONFIG, database: DB_NAME });
  await client.connect();
  await client.query(sql);
  await client.end();

  console.log(`Database "${DB_NAME}" reset and schema applied.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});