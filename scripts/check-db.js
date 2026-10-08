import 'dotenv/config';
import pg from 'pg';
const v=process.env;
console.log(JSON.stringify({
 envHasDatabase:Boolean(v.DATABASE_URL),
 databasePlaceholder:!v.DATABASE_URL||v.DATABASE_URL.includes('USUARIO'),
 ssl:v.DATABASE_SSL==='true',
 emailConfigured:Boolean(v.TEACHER_EMAIL),
 passwordConfigured:Boolean(v.TEACHER_PASSWORD)&&!v.TEACHER_PASSWORD.startsWith('REEMPLAZAR'),
 secretConfigured:Boolean(v.JWT_SECRET?.length>=32&&!v.JWT_SECRET.startsWith('REEMPLAZAR'))
}));
if(v.DATABASE_URL&&!v.DATABASE_URL.includes('USUARIO')){
 const pool=new pg.Pool({connectionString:v.DATABASE_URL,connectionTimeoutMillis:8000,ssl:v.DATABASE_SSL==='true'?{rejectUnauthorized:true}:false});
 try{const result=await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");console.log(JSON.stringify({databaseReachable:true,tables:result.rows.map(x=>x.tablename)}));}
 catch(e){console.log(JSON.stringify({databaseReachable:false,code:e.code||e.name}));process.exitCode=1;}
 finally{await pool.end();}
}
