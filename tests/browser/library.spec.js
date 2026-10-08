import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 const data={niveles:[{id:2,nombre:'A2',orden_nivel:2},{id:1,nombre:'A1',orden_nivel:1},{id:3,nombre:'B1',orden_nivel:3}],etapas:[{id:2,nombre:'Viajes',nivel_id:1,orden_etapa:2},{id:1,nombre:'Saludos',nivel_id:1,orden_etapa:1},{id:3,nombre:'Conversación',nivel_id:2,orden_etapa:1}],lecciones:[{id:2,nombre:'Despedidas',etapa_id:1,orden_leccion:2,contenido_leccion:'<p>Hasta luego.</p>'},{id:1,nombre:'Hola',etapa_id:1,orden_leccion:1,contenido_leccion:'<p>Hola.</p>'},{id:3,nombre:'En el aeropuerto',etapa_id:2,orden_leccion:1},{id:4,nombre:'Opiniones',etapa_id:3,orden_leccion:1}]};
 await page.addInitScript(()=>{sessionStorage.setItem('session','fixture');sessionStorage.setItem('user',JSON.stringify({role:'teacher'}))});
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const value=path==='/api/config'?{preview:false,authReady:true}:path==='/api/catalog'?data:path==='/api/students'?[]:null;
  if(value===null)throw new Error('Ruta inesperada: '+path);
  await route.fulfill({json:value});
 });
 await page.goto('/');await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();
});

test('tarjetas respetan nivel, etapa y orden, y volver conserva la etapa',async({page})=>{
 await expect(page.getByRole('button',{name:'Por niveles',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.library-group-card h3')).toHaveText(['A1','A2','B1']);await expect(page.locator('.lesson-card')).toHaveCount(0);
 await expect(page.locator('.library-management')).not.toHaveAttribute('open','');
 await page.locator('.library-group-card').filter({hasText:'A1'}).click();await expect(page.locator('.library-group-card h3')).toHaveText(['Saludos','Viajes']);
 await page.locator('.library-group-card').filter({hasText:'Saludos'}).click();await expect(page.locator('.lesson-card h3')).toHaveText(['Hola','Despedidas']);
 await page.locator('.lesson-card').filter({hasText:'Hola'}).click();await expect(page.locator('.lesson-view h1')).toHaveText('Hola');await page.getByRole('button',{name:'← Volver',exact:true}).click();
 await expect(page.locator('.lesson-card h3')).toHaveText(['Hola','Despedidas']);
 await page.getByRole('navigation',{name:'Ubicación en la biblioteca'}).getByRole('button',{name:'A1',exact:true}).click();await expect(page.locator('.library-group-card h3')).toHaveText(['Saludos','Viajes']);
 await page.getByRole('navigation',{name:'Ubicación en la biblioteca'}).getByRole('button',{name:'Niveles',exact:true}).click();await page.locator('.library-group-card').filter({hasText:'B1'}).click();await expect(page.getByText('Este nivel todavía no tiene etapas.')).toBeVisible();
});

test('vista plana filtra y se recuerda al recargar; búsqueda funciona en cada paso',async({page})=>{
 await page.getByRole('searchbox',{name:'Buscar niveles'}).fill('a2');await expect(page.locator('.library-group-card h3')).toHaveText(['A2']);
 await page.getByRole('button',{name:'Todas las lecciones',exact:true}).click();await expect(page.locator('.lesson-card')).toHaveCount(4);
 await page.getByRole('combobox',{name:'Filtrar por nivel'}).selectOption('2');await expect(page.locator('.lesson-card h3')).toHaveText(['Opiniones']);
 await page.reload();await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();await expect(page.getByRole('button',{name:'Todas las lecciones',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.lesson-card')).toHaveCount(4);
 await page.getByRole('button',{name:'Por niveles',exact:true}).click();await page.locator('.library-group-card').filter({hasText:'A1'}).click();await page.getByRole('searchbox',{name:'Buscar etapas'}).fill('saludos');await expect(page.locator('.library-group-card h3')).toHaveText(['Saludos']);
 await page.locator('.library-group-card').click();await page.getByRole('searchbox',{name:'Buscar lecciones'}).fill('despedidas');await expect(page.locator('.lesson-card h3')).toHaveText(['Despedidas']);
 await page.reload();await page.getByRole('button',{name:'Biblioteca de clases',exact:true}).click();await expect(page.locator('.library-group-card h3')).toHaveText(['A1','A2','B1']);
 await page.getByRole('button',{name:'Activar modo oscuro'}).click();await page.setViewportSize({width:390,height:844});await expect(page.locator('.library-group-card').first()).toHaveCSS('background-color','rgb(33, 27, 45)');await page.screenshot({path:'test-results/library-levels-mobile.png',fullPage:true});
});

