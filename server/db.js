import 'dotenv/config';
import pg from 'pg';
import {readBackup} from './backup.js';
import {existsSync} from 'node:fs';
export const connected=Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('USUARIO'));
export const pool=connected?new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:false}):null;
const backupPath=process.env.BACKUP_PATH||'./preplytool_backup.dump';
export const snapshot=connected||process.env.VERCEL||!existsSync(backupPath)?null:await readBackup(backupPath);
export const query=(sql,params=[])=>pool.query(sql,params);
