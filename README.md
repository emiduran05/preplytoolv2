# Aula · PreplyTool V2

## Desplegar en Vercel

El proyecto incluye el frontend de Vite y la función `api/index.js`, que sirve Express. `vercel.json` dirige `/api/*` a esa función. Usa el preset Vite, comando `npm run build` y directorio de salida `dist`. `package.json` fija Node.js 24.x para el build y las funciones. La compilación ejecuta `scripts/build-server.js` antes de Vite: empaqueta Express y sus dependencias en `server/.generated/app.mjs` para evitar `ERR_REQUIRE_ESM` al cargar el parser desde `sanitize-html`. La función importa ese archivo y `includeFiles` garantiza su inclusión en Vercel. No se sube el archivo generado a GitHub. Si el proyecto ya existía, confirma Node.js 24.x en Settings → Build and Deployment y redespliega sin reutilizar la caché de build. No reemplaces el comando de build por `vite build`, porque omitiría la API.

En Settings → Environment Variables agrega `DATABASE_URL` (PostgreSQL remoto accesible desde Vercel), `DATABASE_SSL` según tu proveedor, `JWT_SECRET` (al menos 32 caracteres aleatorios), `TEACHER_EMAIL` y `TEACHER_PASSWORD`. Configúralas en los entornos donde usarás la app y vuelve a desplegar después de cambiarlas. No uses una conexión a localhost en Vercel. `.env` no se sube al repositorio.

Restaura el respaldo en la base remota una sola vez si está vacía y ejecuta la migración desde tu computadora siguiendo la sección Conectar PostgreSQL. Si ya contiene los datos, omite la restauración. No subas el respaldo a GitHub: Vercel usa PostgreSQL y no habilita el modo de lectura del respaldo local.

Para comprobar la API abre `https://TU_DOMINIO/api/config`: debe responder JSON. Si falta la conexión, devuelve un error de configuración JSON. El despliegue local no verifica la conexión de Vercel: confirma también el inicio de sesión y la biblioteca en la URL pública.

Las funciones de Vercel limitan los cuerpos de petición y respuesta a 4.5 MB. Las imágenes incrustadas aumentan el tamaño de clases y catálogos: para contenido grande utiliza enlaces de imágenes alojadas externamente. Referencias: https://vercel.com/docs/frameworks/frontend/vite y https://vercel.com/docs/functions/limitations.

React + Vite y API Node.js/Express, sobre las tablas del respaldo real `preplytool_backup.dump` (SQL PostgreSQL). El respaldo original se conserva intacto.

## Iniciar

Requiere Node.js 24.x. Desde este directorio:

```powershell
npm install
npm run dev
```

Abre http://127.0.0.1:5173. Sin DATABASE_URL válida se utiliza el respaldo en **modo de lectura**, con sus alumnos, lecciones y progreso reales. No se guardan cambios en este modo.

## Conectar PostgreSQL

1. Completa los valores genéricos de `.env` (también tienes `.env.example` como referencia). Usa un secreto JWT aleatorio y una contraseña de profesor segura. `DATABASE_SSL=true` exige certificado válido para conexiones remotas.
2. Crea una base PostgreSQL **vacía** (versión 17 o superior) y configura DATABASE_URL. Si ya restauraste este respaldo, omite el paso siguiente.
3. Instala el cliente PostgreSQL `psql` o configura `PSQL_PATH` (por ejemplo `C:/pgsql/bin/psql.exe`). Ejecuta `npm run db:restore`. La restauración ocurre en una sola transacción, adapta las instrucciones de propietario del respaldo y revierte si falla. No la ejecutes sobre una base con tablas existentes.
4. Ejecuta `npm run db:migrate`. Agrega únicamente `aula_student_access` y `aula_submissions` para accesos y ejercicios; conserva las tablas existentes.
5. Reinicia `npm run dev` e inicia sesión con TEACHER_EMAIL y TEACHER_PASSWORD.

## Uso

- Vocabulario: el profesor puede pulsar **Agregar vocabulario** al abrir una lección o en el editor. Introduce una palabra y su definición; se crea una tabla con ambas columnas al final del contenido, y cada nueva entrada agrega una fila a la misma tabla. En la vista de lectura se guarda inmediatamente; en el editor usa **Guardar clase**. La tabla forma parte de la lección compartida y también aparece para los alumnos. Se puede editar con las herramientas de tablas del editor y no necesita una migración de base de datos.

- Biblioteca: crea o edita clases dentro de una etapa existente. Los niveles, etapas y orden se leen de tu respaldo.
- Editor de documentos: cinta Inicio / Insertar / Tabla, estilos, fuentes, tamaño, negrita, cursiva, subrayado, tachado, listas, alineación, interlineado, colores y resaltado. Hoja de documento con zoom y detalles de clase en un panel lateral.
- Imágenes: conserva las imágenes incrustadas del respaldo. Inserta mediante URL o carga PNG/JPG/WEBP/GIF/AVIF/BMP desde el equipo (máximo 6 MB por imagen). Haz clic y arrastra los tiradores de las esquinas para ajustar el tamaño manteniendo la proporción; guarda y vuelve a abrir para conservarlo. Los tiradores también admiten teclas de flecha (Shift para pasos mayores).
- Videos: inserta URL MP4, YouTube o Vimeo. Aparecen dentro del documento al editar. Usa el botón de cada video para quitarlo.
- Tablas: filas, columnas, encabezados, celdas combinadas, colores y anchos arrastrables.
- Ejercicios originales: el HTML conserva su formato e imágenes. Cada respuesta entre llaves, por ejemplo `Mi hermano {él}`, se convierte en un campo vacío al abrir la clase. El botón Revisar respuestas marca cada campo como correcto o incorrecto. El profesor también puede revisarlos durante la clase sin enviar respuestas a nombre del alumno.
- Edición de ejercicios originales: abre la pestaña Ejercicios y edita el documento. Usa Insertar espacio para completar para añadir una respuesta en la posición del cursor. Vista del alumno permite probar los campos y su corrección antes de guardar.
- Ejercicios nuevos: opción múltiple, verdadero/falso, completar, respuesta abierta y relación de concepto con una definición entre varias opciones. Hay corrección individual; las respuestas abiertas requieren revisión del profesor. El alumno puede guardar sus respuestas en su portal.
- Mis alumnos: crea alumnos, selecciona uno y abre una clase. El alumno activo también puede elegirse dentro de la lección y se conserva al recargar. Cambiar Clase completada guarda automáticamente el progreso y las notas actuales; para guardar solo cambios de notas usa Guardar progreso y notas. La interfaz confirma el guardado y muestra los errores. El porcentaje se calcula sobre toda la biblioteca. No existe asignación selectiva de clases: el alumno ve la biblioteca completa.
- Genera un enlace privado por alumno y compártelo manualmente. Reemplazar el enlace invalida el anterior para futuros inicios de sesión; las sesiones existentes duran hasta 8 horas. Los alumnos acceden únicamente a su propio progreso y sus respuestas. El profesor marca la finalización.
- Notas: consulta anotaciones de clases anteriores por alumno.
- Pantalla completa: el botón de cada lección oculta el resto de la aplicación. Puedes salir con el botón o Escape, conservando las respuestas que estás escribiendo.
- En el portal del alumno, Revisar respuestas también guarda las respuestas y el resultado. La finalización de la clase la marca el profesor.

Las imágenes subidas se incrustan en el HTML de la clase; los videos usan alojamiento externo. Los enlaces de PDF y presentaciones del respaldo están disponibles si tienen URL http/https. El contenido HTML se limpia en el servidor antes de mostrarlo y las respuestas correctas de ejercicios originales se mantienen en el servidor.

## Verificación y producción

```powershell
npm test
npm run test:browser
npm run build
npm start
```

`npm start` sirve la compilación y la API en http://127.0.0.1:3001 (o PORT). El servidor escucha únicamente en loopback: publica con un proxy HTTPS si necesitas acceso externo. El enlace del alumno debe generarse desde la dirección pública que usarán los alumnos. No compartas `.env` ni publiques el respaldo (contiene datos personales). Los tokens de sesión se guardan en sessionStorage y los enlaces privados equivalen a credenciales.

Los errores de conexión o de tablas nuevas se resuelven completando `.env`, restaurando la base y ejecutando la migración. `npm test` verifica el lector de PostgreSQL COPY, relaciones del respaldo, cálculo de resultados y eliminación de respuestas correctas del portal.

Las pruebas de navegador usan una aplicación aislada en el puerto 5179 y datos de prueba basados en el respaldo; no modifican tu base ni tu sesión. En Windows usan Edge si está instalado; en otros equipos instala Chromium con `npx playwright install chromium`. Verifican carga y arrastre de imágenes, persistencia del tamaño, inputs originales, corrección, vista previa, formato y tablas.

`npm run db:check` comprueba la conexión y muestra únicamente el estado de configuración y los nombres de tablas, sin credenciales. En Windows, `npm run dev` reinicia la API automáticamente cuando cambia `.env`. Si la base ya contiene tus tablas, omite la restauración y ejecuta únicamente `npm run db:migrate`.

`node scripts/integration.js` verifica el flujo completo sobre una base temporal aislada, restaurada desde el respaldo. Requiere los binarios de PostgreSQL en `C:/pgsql/bin` (o la variable PG_BIN). Usa los puertos 55439 y 3009; detiene y elimina su base temporal al terminar. No utiliza la conexión configurada en `.env`.
# Organización de clases

Usa los iconos de lápiz, papelera y mover para gestionar los elementos. Arrastra el asa de puntos de un nivel, etapa o clase sobre otro elemento de su lista para cambiar el orden; se guarda automáticamente. También puedes enfocar el asa y usar las flechas del teclado. Las etapas se ordenan dentro de su nivel y las clases dentro de su etapa.

En **Biblioteca de clases**, el panel **Niveles y etapas** muestra la estructura completa. El profesor puede crear, renombrar y ordenar niveles y etapas, mover etapas a otro nivel y mover clases a otra etapa. En el editor, los selectores de nivel y etapa están siempre visibles; las clases nuevas requieren elegir ambos antes de guardar.

Mover una clase conserva su progreso, notas, respuestas y vocabulario. Borrar una clase requiere confirmación y elimina también esos datos asociados. Solo se pueden borrar niveles y etapas vacíos; primero mueve o elimina su contenido. No requiere una migración adicional.
