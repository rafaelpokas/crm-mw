# Mega Whip — sua máquina, cada conexão

Experiência fotográfica independente do CRM. Abrir com o servidor local em http://127.0.0.1:3000/catalogo-maquinas/index.html.

## Fluxo

Categoria de equipamento → modelo real → fotografia com conjuntos clicáveis → peças daquele modelo e conjunto. A ficha da peça apresenta os dados comerciais e a fonte oficial, sem oferecer uma navegação inversa por máquinas.

As nove categorias do catálogo público estão contempladas: colhedoras de cana-de-açúcar, colhedoras de algodão, colheitadeiras de grãos, tratores agrícolas, pulverizadores agrícolas, plantadeiras, escavadeiras hidráulicas, pás-carregadeiras e outras aplicações. Esta última reúne os motores classificados como diversas no site de origem.

## Dados

Coleta em 13/10/2026 de todas as 298 páginas indexadas no sitemap público de produtos da Mega Whip, sem falhas. As especificações publicadas identificam 325 nomes de modelos, famílias ou equipamentos. Alguns nomes do catálogo representam plataformas de corte, agricultura de precisão ou famílias, e não máquinas completas. Foram preservados como publicados.

O campo Modelo das especificações é a base principal de compatibilidade; a taxonomia pública é usada quando o campo não existe. Identificadores antigos numéricos nos nomes de classes não foram tratados como modelos reais. Os valores originais são preservados em sourceTaxonomyModelIds para rastreabilidade. Não há inferência por proximidade de numeração ou por aparência da máquina. Preços, estoque, anos e números de série não são inventados.

Scripts de coleta: collect-full-catalog.mjs e finalize-machine-catalog.mjs, nessa ordem. A coleta preserva o HTML em cache para conferência; esses arquivos não precisam entrar no pacote público.

## Fotografias e conjuntos

Cada manifesto photos*.json mantém a origem, legenda e pontos em percentuais da fotografia. Imagens oficiais e de concessionários representam exemplares/configurações identificados. Fotos sem qualidade ou identificação suficiente não são exibidas como se fossem de outro modelo. Quando não há foto aprovada, a interface informa a pendência e mantém as aplicações disponíveis no painel.

CH570, CP770, 8320R e DB74 possuem cenas de apresentação editadas com a ferramenta nativa de imagem a partir de fotografias reais. A legenda identifica a edição. Estas cenas são materiais visuais demonstrativos, não documentação técnica de montagem. Referências e prompts estão em image-prompts.md. Fotos originais são preservadas ao lado das versões editadas.

Os marcadores indicam conjuntos externos correspondentes às aplicações, não localização de conectores ou roteamento de chicotes. Para módulos internos do motor, o ponto indica o conjunto motor. Fotos e posições finais dependem da revisão técnica da Mega Whip antes de se tornarem catálogo oficial.

## Pendências verificáveis

- Fotografia própria/licenciada de todos os modelos ainda não está disponível; a cobertura visual é menor que a base de modelos.
- A imagem coletada inicialmente para M4030 foi rejeitada por identificação divergente e não é reutilizada.
- Algumas fotos de pás-carregadeiras mostram a versão P/G, identificada na legenda; confirmar variantes antes de usar em montagem ou atendimento.
- O motor QSB6.7 Tier 3 é mostrado em configuração ferroviária, conforme a fonte Cummins; não implica validação dessa configuração para toda peça do catálogo.
- ISLE: descrição do catálogo menciona 8,3 L; fonte oficial consultada de ISLe menciona 8,9 L. Não se atribuiu foto de outro motor para ocultar a divergência.

## Execução e validação

`npm run dev` na raiz do projeto. `node scripts/check-machine-catalog.mjs` verifica integridade das relações, categorias, seleção exata do modelo, pontos, peças, lista, exportação, zoom, estado sem foto e celular. `npm run build` gera a distribuição do CRM e desta página.

O pacote estático requer servidor HTTP. Dados, fontes e fotos são locais. Lista de interesse é armazenada apenas no navegador e não é enviada automaticamente. Marca e imagens permanecem de seus respectivos titulares; proposta privada para apresentação à Mega Whip.
