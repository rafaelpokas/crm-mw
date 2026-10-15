import fs from 'node:fs/promises';
const root = 'public/catalogo-3d';
const clean = s => s.replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const groups = [ ['cana','ch570'], ['cana','ch950'], ['cana','a8810'], ['algodao','cp690'], ['graos','s670'], ['trator','8320r'], ['pulverizador','m4025'], ['plantadeira','db74'], ['escavadeira','210g'], ['carregadeira','544'] ];
const records = new Map();
for (const [group,slug] of groups) {
  let pages = 1;
  for(let page=1;page<=pages;page++) {
    const url = `https://megawhip.com.br/modelos/${slug}/${page>1?`page/${page}/`:''}`;
    try {
      const res = await fetch(url); if(!res.ok) continue;
      const html = await res.text();
      for(const m of html.matchAll(/\/page\/(\d+)\//g)) pages=Math.min(30,Math.max(pages,+m[1]));
      for(const m of html.matchAll(/<h[234][^>]*>\s*<a[^>]*href="(https:\/\/megawhip\.com\.br\/catalogo\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        const title=clean(m[2]); if(!/chicote|cabo|conector|kit|sensor/i.test(title)) continue;
        const item=records.get(m[1]) || {url:m[1],title,groups:[]};
        if(!item.groups.includes(group))item.groups.push(group); records.set(m[1],item);
      }
      console.log(group,page,pages,records.size);
    } catch(e) { console.log('Falha',url,e.message); }
  }
}
const items=[...records.values()];
for(let i=0;i<items.length;i+=6) await Promise.all(items.slice(i,i+6).map(async(item)=>{
  try {
    const html=await (await fetch(item.url)).text();
    const text=clean(html);
    const spec=(key,next)=>{const m=text.match(new RegExp(key+'\\s*:?\\s*(.*?)\\s*(?:'+next+')','i'));return m?m[1]:'';};
    item.pn=spec('Código original / Part number','Código Mega') || item.title.split(' ')[0];
    item.code=spec('Código Mega Whip','Marca:');
    item.models=spec('Modelo:','Descrição/aplicação:');
    item.application=spec('Descrição/aplicação:','País');
    item.description=spec('Descrição:','Especificações:');
    const images=[...html.matchAll(/(?:src|data-src)="(https:\/\/megawhip.com.br\/wp-content\/uploads\/[^" ]+\.(?:png|webp|jpg|jpeg))"/g)].map(m=>m[1]);
    const slug=item.url.split('/').filter(Boolean).pop().split('-')[0].toLowerCase();
    item.image=images.find(s=>s.toLowerCase().includes(slug)) || images.find(s=>/76[._-]100|78[._-]100|70[._-]100/.test(s)) || '';
    if(item.image){const r=await fetch(item.image);if(r.ok){const ext=item.image.split('.').pop(); const name=`${items.indexOf(item)}.${ext}`;await fs.writeFile(`${root}/assets/${name}`,Buffer.from(await r.arrayBuffer()));item.localImage=`assets/${name}`;}}
    item.verified=!!item.code;
  } catch(e){item.verified=false;}
}));
await fs.writeFile(`${root}/catalog.json`,JSON.stringify({source:'https://megawhip.com.br/catalogo/',collectedAt:new Date().toISOString(),items},null,2));
console.log('TOTAL',items.length,'detailed',items.filter(i=>i.verified).length);
