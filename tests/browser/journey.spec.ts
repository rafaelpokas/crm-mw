import { test, expect } from '@playwright/test';
test('shared journey preserves slide, CRM route and interest draft', async ({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/plano/index.html#slide-7');
 const nav=()=>page.getByRole('navigation',{name:'Navegação da experiência'});
 await expect(nav().getByRole('link',{name:'Plano',exact:true})).toHaveAttribute('aria-current','page');
 await page.getByRole('button',{name:'Ampliar proposta de campanha'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await nav().getByRole('link',{name:'CRM',exact:true}).click();
 await page.goto('/#/leads');
 await nav().getByRole('link',{name:'Plano',exact:true}).click();await expect(page).toHaveURL(/slide-7$/);
 await nav().getByRole('link',{name:'Catálogo',exact:true}).click();
 await page.locator('#all-parts').click();await page.locator('.part').first().click();await page.locator('#add-part').click();await page.locator('#detail-dialog .close').click();await page.locator('#selection-open').click();await page.locator('#request-crm').click();
 await page.getByLabel('Nome',{exact:true}).fill('Rascunho preservado');
 await nav().getByRole('link',{name:'Plano',exact:true}).click();await nav().getByRole('link',{name:'CRM',exact:true}).click();await expect(page).toHaveURL(/#\/leads$/);
 await page.goto('/#/solicitar');await expect(page.getByLabel('Nome',{exact:true})).toHaveValue('Rascunho preservado');
 await nav().getByRole('link',{name:'Início',exact:true}).click();await expect(page.getByRole('heading',{name:'Da conexão certa ao próximo negócio.'})).toBeVisible();
 expect(errors).toEqual([]);
});
test('mobile journey stays available and every plan slide fits',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const path of ['/','/#/visao-geral','/catalogo-maquinas/index.html','/plano/index.html#slide-1']){
 await page.goto(path);await expect(page.locator('.journey-tabs')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 for(let n=0;n<14;n++){await page.locator('#chapter').selectOption(String(n));await expect(page.locator('.slide.active')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await expect(page.locator('body')).not.toContainText('Relato de Rafa');
});
test('unsaved quote can cancel departure and then leave with one confirmation',async({page})=>{
 await page.goto('/#/cotacoes/Q001/editar');
 await page.getByLabel(/Preço em centavos/).first().fill('25000');
 let prompts=0;const cancel=async(dialog:any)=>{prompts++;await dialog.dismiss()};page.on('dialog',cancel);
 await page.locator('.journey-tabs').getByRole('link',{name:'Plano',exact:true}).click();
 await expect(page).toHaveURL(/Q001\/editar/);expect(prompts).toBe(1);
 page.off('dialog',cancel);page.on('dialog',async dialog=>{prompts++;await dialog.accept()});
 await page.locator('.journey-tabs').getByRole('link',{name:'Plano',exact:true}).click();
 await expect(page).toHaveURL(/plano\/index.html/);expect(prompts).toBe(2);
});
test('catalog machine context survives leaving and returning',async({page})=>{
 await page.goto('/catalogo-maquinas/index.html#categoria=colhedora-de-cana&modelo=ch570');
 await expect(page.locator('#machine-selected')).toBeVisible();
 await page.locator('.journey-tabs').getByRole('link',{name:'Plano',exact:true}).click();
 await page.locator('.journey-tabs').getByRole('link',{name:'Catálogo',exact:true}).click();await expect(page).toHaveURL(/modelo=ch570$/);
});
