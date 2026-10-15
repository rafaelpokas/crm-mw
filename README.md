# MegaWhip CRM — protótipo funcional

Aplicação local em React + TypeScript para demonstrar o processo comercial B2B. Dados, preços, respostas do assistente e envios são fictícios. Não precisa de chave de API, backend ou credenciais.

## Executar

Node 22.12+ (validado com Node 24) e npm:

```sh
npm ci
npm run dev
```

Abra http://localhost:3000. Para gerar os arquivos de distribuição: `npm run build`. O projeto utiliza `package-lock.json` como referência de dependências.

## Verificar

```sh
npm run lint
npm test
npm run test:e2e
```

Os testes de navegador usam Chrome instalado (`channel: chrome`) em modo headless e iniciam um servidor local na porta 3000. Feche outro servidor nessa porta antes de executá-los. As capturas e os rastros de falhas ficam em `test-results/`, fora do Git.

## Demonstrar

1. Troque para Gestor Demo no menu superior para visualizar a operação completa. Vendedores veem sua carteira e a fila sem responsável; o técnico vê apenas registros atribuídos a ele.
2. Na central de demonstração, execute C01–C16. Cada cenário parte de uma base independente, substitui os dados da demonstração e confere o resultado. Há confirmação antes da substituição.
3. Para demonstrar manualmente, crie um lead, registre o interesse, qualifique e converta em oportunidade. A cotação começa vazia; selecione os itens, confirme preços/frete e, quando exigido, obtenha validação técnica e aprovação do gestor.
4. Envie por um ou ambos os canais. Falhas aparecem separadamente; reenvio não duplica um canal já entregue. Abra a visão do comprador, aceite e confirme o ganho na oportunidade.
5. O modo automático de triagem depende da regra A02 ativa. O assistente é determinístico e apresenta somente fontes aprovadas. Nenhuma API de IA é chamada.
6. Use Restaurar demonstração para limpar dados e anexos e voltar ao relógio de 09/10/2026 às 15h. Os indicadores globais, no perfil gestor e sem filtros, são 6 abertas / R$ 15.722, 1 ganha / R$ 1.200, 1 perdida, 50% de conversão e 2 tarefas atrasadas.

## Organização

- `src/domain/engine.ts`: comandos atômicos, validações, permissões e eventos. Falhas de validação preservam o estado; falha de entrega registra a tentativa sem avançar a venda.
- `src/domain/selectors.ts`: escopo de leitura por perfil, indicadores, janela do WhatsApp e sugestões demonstrativas.
- `src/domain/storage.ts`: persistência versionada em localStorage e arquivos em IndexedDB. A base v1 é preservada, mas não importada automaticamente porque contém estados incompatíveis com as regras corrigidas.
- `src/domain/scenarios.ts`: preparação e verificação isoladas dos 16 cenários.
- `src/context/CrmContext.tsx`: adaptador React, latência, recuperação, cancelamento após reset e deduplicação de operações simultâneas.

## Decisões do protótipo

- A revisão publicada continua válida enquanto outra está em rascunho. Aceitar a publicada cancela seu rascunho pendente. Alterações posteriores ao aceite exigem nova negociação.
- O limite de desconto e o prazo de retorno são configuráveis. Dias úteis excluem sábados e domingos; não há calendário de feriados.
- Anexos aceitos: PDF, PNG e JPEG até 5 MB. Permanecem apenas no navegador em que foram enviados.
- CSV aceita vírgula ou ponto e vírgula, campos entre aspas e prévia com mapeamento. Linhas inválidas e duplicadas são contabilizadas sem importar silenciosamente dados incorretos.
- Permissões e trilha de auditoria simulam as regras do produto. Não representam autenticação ou proteção de dados de um sistema em produção. Links do comprador identificam uma revisão demonstrativa; não são links públicos seguros de produção.
- Não há integração real com WhatsApp, e-mail, ERP ou serviços de IA; não há sincronização entre dispositivos ou uso simultâneo por vários usuários.

## Apresentação integrada (15/10/2026)

A raiz abre a apresentação. O catálogo por máquina com fotografias está em `/catalogo-maquinas/index.html` e o CRM em `/#/visao-geral`. No catálogo, selecione peças e use **Simular atendimento** para criar um lead no mesmo navegador. Nenhum envio é real.

Campanhas e inteligência de mercado estão disponíveis no perfil Gestor Demo, padrão de novas bases. O relatório detalhado de implementação e as notas internas são mantidos localmente, fora deste repositório público.

Publicação Netlify: build definido em `netlify.toml`, saída `dist`, Node 24; `.netlify/` excluído do Git. Não há chaves ou serviços externos necessários.
