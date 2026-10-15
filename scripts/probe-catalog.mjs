for(const u of ['https://megawhip.com.br/wp-sitemap.xml','https://megawhip.com.br/sitemap_index.xml']){const r=await fetch(u);const t=await r.text();console.log(u,r.status,t.slice(0,6000));}
const t=await(await fetch('https://megawhip.com.br/catalogo/axt20383/')).text();console.log(t.match(/class="[^"]*catalogo[^"]*"/g)?.slice(0,8));
