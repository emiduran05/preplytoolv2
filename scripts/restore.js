import 'dotenv/config';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {portableDump} from '../server/restore-sql.js';
const url=process.env.DATABASE_URL;
if(!url||url.includes('USUARIO'))throw new Error('Completa DATABASE_URL apuntando a una base vacía.');
const target=new URL(url);const file=resolve('.restore.tmp.sql');
let sql=await readFile(process.env.BACKUP_PATH||'preplytool_backup.dump','utf8');
sql=portableDump(sql);
await writeFile(file,sql);
try{await new Promise((ok,fail)=>{const p=spawn(process.env.PSQL_PATH||'psql',['-h',target.hostname,'-p',target.port||'5432','-U',decodeURIComponent(target.username),'-d',target.pathname.slice(1),'-v','ON_ERROR_STOP=1','--single-transaction','-f',file],{stdio:'inherit',env:{...process.env,PGPASSWORD:decodeURIComponent(target.password),PGSSLMODE:process.env.DATABASE_SSL==='true'?'verify-full':'prefer'}});p.on('error',fail);p.on('exit',code=>code===0?ok():fail(new Error('Restauración fallida; transacción revertida.')))});console.log('Respaldo restaurado; ejecuta npm run db:migrate.');}finally{await unlink(file);}
