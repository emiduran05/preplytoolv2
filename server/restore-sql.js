// El respaldo proviene de Neon. No trasladar permisos de roles del proveedor.
export function portableDump(sql){return sql
 .replace(/^\\(?:un)?restrict .*$/gm,'')
 .replace(/^ALTER .* OWNER TO .*;$/gm,'')
 .replace(/^ALTER DEFAULT PRIVILEGES .*;$/gm,'')
 .replace(/^SET transaction_timeout = .*;$/gm,'');}
