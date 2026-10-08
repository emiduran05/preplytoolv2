import {pool,connected} from '../server/db.js';
import {readFile} from 'node:fs/promises';
if(!connected)throw new Error('Completa DATABASE_URL en .env');
try{await pool.query(await readFile(new URL('../server/migration.sql',import.meta.url),'utf8'));console.log('Migración completada.');}finally{await pool.end();}
