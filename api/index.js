export function createHandler(loadApp=()=>import('../server/index.js')){
 let application;
 return async function handler(req,res){
  try{
   application??=loadApp();
   const {default:app}=await application;
   return app(req,res);
  }catch(error){
   application=undefined;
   const reason=typeof error?.code==='string'?error.code:error?.name||'UnknownError';
   console.error('API_STARTUP_FAILED',reason);
   if(res.headersSent)return res.end();
   res.statusCode=500;res.setHeader('Content-Type','application/json; charset=utf-8');
   res.end(JSON.stringify({
    error:reason==='ERR_INVALID_URL'?'La configuración del servidor contiene una URL inválida. Revisa DATABASE_URL en Vercel.':'No se pudo iniciar la API. Revisa los registros de la función en Vercel.',
    code:'API_STARTUP_FAILED',reason
   }));
  }
 };
}
export default createHandler();
