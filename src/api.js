export async function api(path,options={}){
 const response=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(sessionStorage.getItem('session')||''),...options.headers},body:options.body?JSON.stringify(options.body):undefined});
 const text=await response.text();let data;
 try{data=JSON.parse(text)}catch{
  if(response.status===413)throw new Error('La clase es demasiado grande para el servidor. Reduce el tamaño de las imágenes e inténtalo de nuevo.');
  throw new Error(`La API no devolvió JSON (HTTP ${response.status}). Revisa la configuración del servidor y de las rutas /api en el despliegue.`);
 }
 if(!response.ok)throw new Error(data?.error||'Error del servidor');return data;
}
