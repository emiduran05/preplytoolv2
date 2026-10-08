import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {parse} from 'dotenv';
const contents=await readFile('.env','utf8');
const secret=parse(contents).JWT_SECRET;
if(!secret||secret.length<32||secret.startsWith('REEMPLAZAR')){
 const line='JWT_SECRET='+randomBytes(48).toString('hex');
 const updated=/^\s*JWT_SECRET\s*=.*$/m.test(contents)?contents.replace(/^\s*JWT_SECRET\s*=.*$/m,line):contents+'\n'+line+'\n';
 await writeFile('.env',updated);console.log('JWT_SECRET seguro generado; las demás variables se conservaron.');
}else console.log('JWT_SECRET ya es válido.');
