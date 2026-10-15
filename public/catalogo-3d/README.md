# Mega Whip — catálogo imersivo demonstrativo

Página independente do CRM. Endereço de desenvolvimento: http://127.0.0.1:3000/catalogo-3d/index.html

## Demonstração

1. Escolha uma categoria de máquina.
2. Arraste para girar e role para aproximar. Em telas de toque, use um dedo para girar e dois para aproximar.
3. Selecione os pontos ou os filtros de aplicação. Use Raio X para expor o circuito ilustrativo e Explodir para separar conjuntos.
4. Ative o tour guiado para percorrer os conjuntos automaticamente.
5. Busque por Part Number, código Mega ou modelo. Abra uma peça para consultar especificações, foto e fonte oficial.
6. Adicione peças à seleção e baixe a lista de interesse para uma consulta comercial. Não há envio automático.

## Origem dos dados

Coleta de páginas públicas de https://megawhip.com.br em 13/10/2026. A seleção contém 118 produtos obtidos pelas páginas dos modelos CH570, CH950, A8810, CP690, S670, 8320R, M4025, DB74, 210G e 544, incluindo paginação. Cada registro preserva a URL oficial. Não é o catálogo completo e não há sincronização em tempo real. Preços e estoque não foram importados.

Fotos oficiais disponíveis foram copiadas para uso local. Os arquivos de dados estão em catalog.json. Atualização: executar `node scripts/collect-catalog.mjs` na raiz do projeto com acesso à internet. Confirmar a coleta antes de substituir uma versão de apresentação.

## Representação 3D

Geometria procedural ilustrativa, com oito categorias de máquinas. Não são modelos CAD dos fabricantes. O circuito e os hotspots demonstram o conceito de navegação; não representam rotas elétricas ou coordenadas exatas de instalação. A correspondência entre peça e aplicação usa as descrições públicas. Uma versão técnica depende de arquivos 3D licenciados e validação de engenharia por modelo, versão e número de série.

## Distribuição

Recursos essenciais, biblioteca Three.js e fontes estão locais. Requer servidor HTTP e navegador com WebGL; não abrir por file://. A versão de produção é gerada junto do projeto com `npm run build` e fica em dist/catalogo-3d. A página principal do CRM permanece independente.

Biblioteca Three.js sob MIT (vendor/LICENSE-three.txt). Fontes Barlow sob OFL (assets/LICENSE-fonts.txt). Marca, fotos e conteúdo de produtos pertencem aos respectivos titulares. Esta proposta não se apresenta como publicação oficial da Mega Whip.
