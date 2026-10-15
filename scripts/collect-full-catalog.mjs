import fs from 'node:fs/promises';
const root='public/catalogo-maquinas';const cache='.catalog-cache';await fs.mkdir(`${root}/assets/products`,{recursive:true});await fs.mkdir(cache,{recursive:true});
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
async function get(url){const res=await fetch(url,{signal:AbortSignal.timeout(40000)});if(!res.ok)throw Error(`${res.status} ${url}`);return res.text();}
const xml=await get('https://megawhip.com.br/catalogo-sitemap.xml');
const entries=[...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m=>({url:m[1].match(/<loc>(.*?)<\/loc>/)?.[1],image:m[1].match(/<image:loc>(.*?)<\/image:loc>/)?.[1]})).filter(e=>/\/catalogo\/.+/.test(e.url));
console.log('Indexed products',entries.length);
const modelXml=await get('https://megawhip.com.br/modelos-sitemap.xml');
const modelSlugs=[...modelXml.matchAll(/<loc>https:\/\/megawhip.com.br\/modelos\/([^/]+)\/<\/loc>/g)].map(m=>m[1]);
const items=[],failures=[];
for(let i=0;i<entries.length;i+=6){await Promise.all(entries.slice(i,i+6).map(async(e)=>{try{
const slug=e.url.split('/').filter(Boolean).pop();let html;try{html=await fs.readFile(`${cache}/${slug}.html`,'utf8');}catch{html=await get(e.url);await fs.writeFile(`${cache}/${slug}.html`,html);}
const body=clean(html);const spec=(key,next)=>body.match(new RegExp(key+'\\s*:?\\s*(.*?)\\s*(?:'+next+')','i'))?.[1]||'';
const classes=html.match(/class="[^"]*elementor-location-single[^\"]*hentry([^\"]*)"/)?.[1]||'';
const tokens=classes.trim().split(/\s+/);
const groups=tokens.filter(t=>t.startsWith('maquinas-')).map(t=>t.slice(9));
const modelIds=tokens.filter(t=>t.startsWith('modelos-')).map(t=>t.slice(8));
const title=clean(html.match(/<h[12][^>]*class="[^"]*elementor-heading-title[^\"]*"[^>]*>([\s\S]*?)<\/h[12]>/)?.[1]||html.match(/<title>(.*?)<\/title>/)?.[1]||'').replace(/ - Mega Whip$/,'');
const p={url:e.url,title,pn:spec('Código original / Part number','Código Mega')||title.split(' ')[0],code:spec('Código Mega Whip','Marca:'),modelsText:spec('Modelo:','Descrição/aplicação:'),application:spec('Descrição/aplicação:','País'),description:spec('Descrição:','Especificações:'),groups,modelIds,image:e.image||''};
if(e.image){const name=`${slug}.${e.image.split('.').pop()}`;const target=`${root}/assets/products/${name}`;try{await fs.access(target);}catch{const r=await fetch(e.image,{signal:AbortSignal.timeout(30000)});if(r.ok)await fs.writeFile(target,Buffer.from(await r.arrayBuffer()));}try{await fs.access(target);p.localImage=`assets/products/${name}`;}catch{}}
items.push(p);
}catch(err){failures.push({url:e.url,error:err.message});}}));console.log(Math.min(i+6,entries.length),'/',entries.length,'products',items.length,'failures',failures.length);}
items.sort((a,b)=>a.title.localeCompare(b.title));
const catNames={'colhedora-de-cana':'Colhedoras de cana-de-açúcar','colhedora-de-algodao':'Colhedoras de algodão','colhedora-de-graos':'Colheitadeiras de grãos','trator':'Tratores agrícolas','pulverizador':'Pulverizadores agrícolas','plantadeira':'Plantadeiras','escavadeira':'Escavadeiras hidráulicas','pa-carregadeira':'Pás-carregadeiras','diversas':'Outras aplicações'};
const labels={};
// Taxonomy labels from the public catalogue sidebar, preserving the actual model names.
const sample=await get('https://megawhip.com.br/modelos/ch570/');
for(const m of sample.matchAll(/href="https:\/\/megawhip.com.br\/modelos\/([^/]+)\/"[^>]*>([\s\S]*?)<\/a>/g)){const label=clean(m[2]);if(label&&!label.includes('Detalhes'))labels[m[1]]=label;}
const models=modelSlugs.map(id=>({id,name:labels[id]||id.replace(/-/g,' ').toUpperCase(),groups:[...new Set(items.filter(p=>p.modelIds.includes(id)).flatMap(p=>p.groups))],productUrls:items.filter(p=>p.modelIds.includes(id)).map(p=>p.url)})).filter(m=>m.productUrls.length);
const categories=Object.entries(catNames).map(([id,name])=>({id,name,models:models.filter(m=>m.groups.includes(id)).map(m=>m.id)}));
await fs.writeFile(`${root}/catalog.json`,JSON.stringify({source:'https://megawhip.com.br/catalogo/',collectedAt:new Date().toISOString(),indexed:entries.length,failures,categories,models,items},null,2));
console.log('FINAL',JSON.stringify({products:items.length,models:models.length,categories:categories.map(c=>[c.name,c.models.length]),failures}));
