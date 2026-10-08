import 'dotenv/config';
import pg from 'pg';
import {readBackup} from './backup.js';
export const connected=Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('USUARIO'));
export const pool=connected?new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:false}):null;
export const snapshot=connected?null:await readBackup(process.env.BACKUP_PATH||'./preplytool_backup.dump');
export const query=(sql,params=[])=>pool.query(sql,params);
