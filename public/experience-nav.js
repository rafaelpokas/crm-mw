/* One navigation contract shared by the presentation, catalog and CRM. */
(()=>{
 const read=(key,fallback)=>{try{return sessionStorage.getItem(key)||fallback}catch{return fallback}};
 const save=(key,value)=>{try{sessionStorage.setItem(key,value)}catch{}};
 const path=location.pathname;
 const area=()=>path.startsWith('/plano/')?'plan':path.startsWith('/catalogo-maquinas/')?'catalog':(!location.hash||location.hash==='#/apresentacao')?'home':'crm';
 if(area()==='catalog'&&!location.hash){const hash=read('mw-journey-machine','');if(/^#categoria=[\w%-]+&modelo=[\w%-]+$/.test(hash))history.replaceState(null,'',hash);}
 const bar=document.createElement('nav');bar.className='journey-nav';bar.setAttribute('aria-label','Navegação da experiência');
 bar.innerHTML='<a class="journey-brand" href="/#/apresentacao" aria-label="Ir ao início da experiência"><img src="/logo-megawhip.png" alt="MegaWhip"><span>Experiência<br><b>comercial</b></span></a><div class="journey-tabs"><a data-area="home" href="/#/apresentacao">Início</a><a data-area="plan" href="/plano/index.html">Plano</a><a data-area="catalog" href="/catalogo-maquinas/index.html">Catálogo</a><a data-area="crm" href="/#/visao-geral">CRM</a></div><span class="journey-status">Ambiente demonstrativo</span>';
 document.body.prepend(bar);document.documentElement.classList.add('has-journey-nav');
 const sync=()=>{const current=area();if(current==='crm'&&/^#\/[\w/-]+(?:\?[^#]*)?$/.test(location.hash)&&!location.hash.startsWith('#/solicitar')&&!location.hash.startsWith('#/simulador'))save('mw-journey-crm',location.hash);if(current==='catalog')save('mw-journey-machine',location.hash);bar.querySelectorAll('[data-area]').forEach(a=>{if(a.dataset.area===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});const lastSlide=read('mw-plan-slide','1');bar.querySelector('[data-area=plan]').href='/plano/index.html#slide-'+(/^\d+$/.test(lastSlide)?Math.max(1,Math.min(14,Number(lastSlide))):1);const route=read('mw-journey-crm','#/visao-geral');bar.querySelector('[data-area=crm]').href='/'+(/^#\/[\w/-]+(?:\?[^#]*)?$/.test(route)?route:'#/visao-geral');};
 sync();addEventListener('hashchange',sync);addEventListener('pageshow',sync);addEventListener('journeychange',sync);
 // replaceState is used by the machine selector: save its visible URL when leaving.
 addEventListener('pagehide',()=>{if(area()==='catalog')save('mw-journey-machine',location.hash);});
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;if(area()==='catalog')save('mw-journey-machine',location.hash);if(window.__crmDirty&&url.pathname!==location.pathname){if(!confirm('Há alterações não salvas. Sair sem salvar?')){e.preventDefault();e.stopImmediatePropagation();}else{window.__crmDirty=false;}}},true);
 addEventListener('beforeunload',e=>{if(window.__crmDirty){e.preventDefault();e.returnValue='';}});
})();
