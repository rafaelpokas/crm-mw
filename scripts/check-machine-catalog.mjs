import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const root='public/catalogo-maquinas';
const data=JSON.parse(await fs.readFile(`${root}/catalog.json`,'utf8'));
if(data.items.length!==298||data.failures.length)throw Error('Incomplete collection');
if(data.items.some(p=>p.title==='Produtos'))throw Error('Generic product titles');
if(data.models.some(m=>!m.name||!m.productUrls.length))throw Error('Model without published product');
for(const p of data.items){if(!p.url.startsWith('https://megawhip.com.br/catalogo/'))throw Error('Untrusted URL');for(const id of p.modelIds)if(!data.models.some(m=>m.id===id))throw Error('Orphan model');}
console.log('Data',data.items.length,'products',data.models.length,'models');
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:20000,args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage({viewport:{width:1500,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))console.log('HTTP',r.status(),r.url());});
try{
await page.goto('http://127.0.0.1:3000/catalogo-maquinas/index.html',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.part');await page.locator('#machine-photo').evaluate(img=>img.complete||new Promise(r=>img.onload=r));
console.log('Initial',await page.locator('#machine-selected').innerText(),await page.locator('.hotspot').count(),'hotspots');
await page.screenshot({path:'test-results/machine-catalog-desktop.png',fullPage:true});
await page.locator('.hotspot[data-zone="elevador"]').click();
const elev=data.items.filter(p=>p.modelIds.includes('ch570')&&p.groups.includes('colhedora-de-cana')&&/elevador/i.test(p.application));
if(await page.locator('.part').count()!==elev.length)throw Error('Hotspot shows wrong parts');
await page.locator('.part').first().click();
if(await page.locator('#detail-dialog').isVisible()!==true)throw Error('Missing detail');
await page.locator('#add-part').click();await page.locator('#detail-dialog .close').click();
await page.locator('#selection-open').click();if(await page.locator('.selection-row').count()!==1)throw Error('Selection failed');
const download=page.waitForEvent('download');await page.locator('#download').click();console.log('Export',(await download).suggestedFilename());await page.locator('#selection-dialog .close').click();
await page.locator('#zoom-in').click();if(await page.locator('#zoom-reset').innerText()!=='125%')throw Error('Zoom failed');await page.locator('#zoom-reset').click();
const defaults={'colhedora-de-algodao':'cp770','colhedora-de-graos':'s790','trator':'8320r','pulverizador':'m4025','plantadeira':'db74','escavadeira':'210g','pa-carregadeira':'544','diversas':'qsb'};
for(const [category,model] of Object.entries(defaults)){
await page.locator(`[data-category="${category}"]`).click();await page.locator('#model-search').fill(model==='8320r'?'8320R':model);
const target=page.locator(`[data-model="${model}"]`);if(!await target.count())throw Error('Missing model '+model);await target.click();
await page.locator('#machine-photo').evaluate(img=>img.complete||new Promise(r=>img.onload=r));
console.log(category,await page.locator('#machine-selected').innerText(),await page.locator('.part').count(),'parts',await page.locator('.hotspot').count(),'points');
if(await page.locator('.part').count()===0)throw Error('Empty known model');
if(category!=='diversas'&&await page.locator('#no-photo').isVisible())throw Error('Missing category photograph');
}
// A model without an approved photo must never inherit another machine's image.
await page.locator('[data-category="colhedora-de-cana"]').click();await page.locator('#model-search').fill('CH960');await page.locator('[data-model="ch960"]').click();if(!await page.locator('#no-photo').isVisible())throw Error('Missing-photo disclosure absent');if(await page.locator('.hotspot').count())throw Error('Hotspots without exact image');
await page.locator('#machine-open').click();await page.locator('#model-search').fill('CH570');await page.locator('[data-model="ch570"]').click();
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'test-results/machine-catalog-mobile.png',fullPage:true});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Mobile overflow');
await page.locator('.hotspot').first().click();if(await page.locator('.part').count()===0)throw Error('Mobile hotspot failed');
if(errors.length)throw Error(errors.join('\n'));console.log('PASS: categories, exact model filtering, hotspots, detail, selection, export, zoom, missing photos, mobile.');
}finally{await browser.close();}
