import fs from 'node:fs/promises';
const root='public/catalogo-maquinas';
const d=JSON.parse(await fs.readFile(`${root}/catalog.json`,'utf8'));
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const oldNames=new Map(d.models.map(m=>[normalize(m.name),m]));
const models=new Map();
for(const p of d.items){
 const html=await fs.readFile(`.catalog-cache/${p.url.split('/').filter(Boolean).pop()}.html`,'utf8');
 p.title=clean(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]||p.title).replace(/\s*-\s*Mega Whip$/,'');
 p.sourceTaxonomyModelIds=p.sourceTaxonomyModelIds||p.modelIds;
 const tokens=p.modelsText.split(/\s*[/,;]\s*/).map(s=>s.trim()).filter(s=>s&&s.length<70);
 if(tokens.length){p.compatibilityBasis='published-specifications';p.modelIds=tokens.map(name=>{const known=oldNames.get(normalize(name));const id=known?.id||slug(name);if(!models.has(id))models.set(id,{id,name:known?.name||name,groups:[],productUrls:[]});return id;});}
 else{p.compatibilityBasis='published-taxonomy';p.modelIds=p.sourceTaxonomyModelIds.filter(id=>!/^\d+$/.test(id)&&d.models.some(m=>m.id===id));for(const id of p.modelIds){if(!models.has(id)){const m=d.models.find(m=>m.id===id);models.set(id,{id,name:m.name,groups:[],productUrls:[]});}}}
 for(const id of p.modelIds){const m=models.get(id);m.groups=[...new Set([...m.groups,...p.groups])];m.productUrls.push(p.url);}
}
d.models=[...models.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
for(const c of d.categories)c.models=d.models.filter(m=>m.groups.includes(c.id)).map(m=>m.id);
d.items.sort((a,b)=>a.title.localeCompare(b.title));
await fs.writeFile(`${root}/catalog.json`,JSON.stringify(d,null,2));
const normalizePhotoKeys=p=>Object.fromEntries(Object.entries(p).map(([id,v])=>{const match=d.models.find(m=>normalize(m.id)===normalize(id));return[match?.id||id,v];}));
for(const file of ['photos-extra.json','photos-deere-extra.json']){const p=JSON.parse(await fs.readFile(`${root}/${file}`,'utf8'));await fs.writeFile(`${root}/${file}`,JSON.stringify(normalizePhotoKeys(p),null,2));}
console.log('Finalized',d.items.length,'products',d.models.length,'models',d.categories.map(c=>[c.id,c.models.length]));
