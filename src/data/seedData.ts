import type { CrmDatabase } from "./types";
export const INITIAL_CRM_DATA: CrmDatabase = {
  "meta": {
    "schemaVersion": 1,
    "name": "MegaWhip CRM Demo",
    "synthetic": true,
    "clock": "2026-10-09T15:00:00-03:00",
    "timezone": "America/Sao_Paulo",
    "currency": "BRL",
    "locale": "pt-BR",
    "defaultUserId": "U001",
    "notice": "Todos os registros, valores e produtos são fictícios. Não realizar envios reais."
  },
  "rules": {
    "sellerDiscountLimitBps": 500,
    "quantityMax": 9999,
    "defaultLatencyMs": 400,
    "followUpBusinessDays": 1,
    "excludeWeekends": true,
    "holidayCalendar": null,
    "realIntegrationsEnabled": false
  },
  "users": [
    {
      "id": "U001",
      "name": "Gestor Demo",
      "role": "manager",
      "active": true
    },
    {
      "id": "U002",
      "name": "Ana Demo",
      "role": "seller",
      "active": true
    },
    {
      "id": "U003",
      "name": "Bruno Demo",
      "role": "seller",
      "active": true
    },
    {
      "id": "U004",
      "name": "Técnico Demo",
      "role": "technical",
      "active": true
    },
    {
      "id": "U005",
      "name": "Admin Commet Demo",
      "role": "admin",
      "active": true
    }
  ],
  "companies": [
    {
      "id": "E001",
      "name": "Agro Horizonte Demo",
      "segment": "Reposição agrícola",
      "city": "Cidade Demo",
      "state": "SP",
      "document": null,
      "fictitious": true,
      "segmentProfile": {
        "mainSegment": "Cana de açúcar",
        "additionalSegments": [
          "Grãos (Soja/Milho)"
        ],
        "crop": [
          "Cana-de-açúcar"
        ],
        "supplyChainRole": "Usina",
        "region": "Ribeirão Preto / SP",
        "confirmedMachines": [
          "Colheitadeira CH570",
          "Trator Magnum 340"
        ],
        "qualificationStatus": "confirmed",
        "confidence": "confirmed",
        "lastValidatedAt": "2026-10-10T11:00:00-03:00",
        "validationSource": "Reunião de qualificação técnica"
      }
    },
    {
      "id": "E002",
      "name": "Oficina Campo Norte Demo",
      "segment": "Oficina",
      "city": "Cidade Demo",
      "state": "SP",
      "document": null,
      "fictitious": true,
      "segmentProfile": {
        "mainSegment": "Reposição agrícola",
        "additionalSegments": [
          "Oficina"
        ],
        "crop": [
          "Milho",
          "Soja"
        ],
        "supplyChainRole": "Oficina multimarca",
        "region": "Triângulo Mineiro / MG",
        "confirmedMachines": [
          "Trator John Deere 7200"
        ],
        "qualificationStatus": "confirmed",
        "confidence": "confirmed",
        "lastValidatedAt": "2026-10-09T14:00:00-03:00",
        "validationSource": "Atendimento comercial"
      }
    },
    {
      "id": "E003",
      "name": "Revenda Vale Verde Demo",
      "segment": "Revenda",
      "city": "Cidade Demo",
      "state": "SP",
      "document": null,
      "fictitious": true,
      "segmentProfile": {
        "mainSegment": "Grãos (Soja/Milho)",
        "additionalSegments": [
          "Revenda"
        ],
        "crop": [
          "Soja",
          "Milho"
        ],
        "supplyChainRole": "Revenda de Peças",
        "region": "Sorriso / MT",
        "confirmedMachines": [
          "Pulverizador Patriot 350"
        ],
        "qualificationStatus": "confirmed",
        "confidence": "confirmed",
        "lastValidatedAt": "2026-10-08T16:00:00-03:00",
        "validationSource": "Histórico de compras"
      }
    },
    {
      "id": "E004",
      "name": "Máquinas Aurora Demo",
      "segment": "Projeto OEM",
      "city": "Cidade Demo",
      "state": "SP",
      "document": null,
      "fictitious": true,
      "segmentProfile": {
        "mainSegment": "Projeto OEM",
        "additionalSegments": [
          "Industrial"
        ],
        "crop": [],
        "supplyChainRole": "Fabricante Implementos",
        "region": "Campinas / SP",
        "confirmedMachines": [
          "Implemento sob medida"
        ],
        "qualificationStatus": "partial",
        "confidence": "hypothesis",
        "lastValidatedAt": "2026-10-07T10:00:00-03:00",
        "validationSource": "Formulário inicial site"
      }
    },
    {
      "id": "E005",
      "name": "Agro Peças Central Demo",
      "segment": "Reposição agrícola",
      "city": "Cidade Demo",
      "state": "SP",
      "document": null,
      "fictitious": true,
      "segmentProfile": {
        "mainSegment": "Reposição agrícola",
        "additionalSegments": [
          "Citros"
        ],
        "crop": [
          "Laranja"
        ],
        "supplyChainRole": "Revenda de Peças",
        "region": "Araraquara / SP",
        "confirmedMachines": [],
        "qualificationStatus": "confirmed",
        "confidence": "confirmed",
        "lastValidatedAt": "2026-10-06T15:00:00-03:00",
        "validationSource": "Atendimento WhatsApp"
      }
    },
    {
      "id": "E006",
      "name": "Cultivo Sul Demo",
      "segment": "Oficina",
      "city": "Cidade Demo",
      "state": "SP",
      "document": null,
      "fictitious": true,
      "segmentProfile": {
        "mainSegment": "Grãos (Soja/Milho)",
        "additionalSegments": [
          "Trigo"
        ],
        "crop": [
          "Trigo",
          "Soja"
        ],
        "supplyChainRole": "Produtor rural",
        "region": "Passo Fundo / RS",
        "confirmedMachines": [
          "Colheitadeira S680"
        ],
        "qualificationStatus": "confirmed",
        "confidence": "confirmed",
        "lastValidatedAt": "2026-10-05T12:00:00-03:00",
        "validationSource": "Visita comercial"
      }
    },
    {
      "id": "E007",
      "name": "Oficina Rota Rural Demo",
      "segment": "Revenda",
      "city": "Cidade Demo",
      "state": "SP",
      "document": null,
      "fictitious": true,
      "segmentProfile": {
        "mainSegment": "Café",
        "additionalSegments": [
          "Oficina"
        ],
        "crop": [
          "Café"
        ],
        "supplyChainRole": "Oficina especializada",
        "region": "Sul de Minas / MG",
        "confirmedMachines": [
          "Trator cafeeiro estreito"
        ],
        "qualificationStatus": "confirmed",
        "confidence": "confirmed",
        "lastValidatedAt": "2026-10-04T09:00:00-03:00",
        "validationSource": "Recomendação técnica"
      }
    },
    {
      "id": "E008",
      "name": "Implementos Planalto Demo",
      "segment": "Projeto OEM",
      "city": "Cidade Demo",
      "state": "SP",
      "document": null,
      "fictitious": true,
      "segmentProfile": {
        "mainSegment": "Projeto OEM",
        "additionalSegments": [
          "Cana de açúcar"
        ],
        "crop": [
          "Cana-de-açúcar"
        ],
        "supplyChainRole": "Fabricante Implementos",
        "region": "Ribeirão Preto / SP",
        "confirmedMachines": [
          "Transbordo canavieiro"
        ],
        "qualificationStatus": "confirmed",
        "confidence": "confirmed",
        "lastValidatedAt": "2026-10-03T14:00:00-03:00",
        "validationSource": "Homologação de engenharia"
      }
    }
  ],
  "contacts": [
    {
      "id": "C001",
      "companyId": "E001",
      "name": "Comprador Demo 01",
      "email": "comprador01@example.com",
      "whatsappMockId": "WA-DEMO-001",
      "preferredChannel": "whatsapp",
      "doNotContact": false,
      "unsubscribedFromMarketing": false
    },
    {
      "id": "C002",
      "companyId": "E002",
      "name": "Comprador Demo 02",
      "email": "comprador02@example.com",
      "whatsappMockId": "WA-DEMO-002",
      "preferredChannel": "whatsapp",
      "doNotContact": false,
      "unsubscribedFromMarketing": false
    },
    {
      "id": "C003",
      "companyId": "E003",
      "name": "Comprador Demo 03",
      "email": "comprador03@example.com",
      "whatsappMockId": "WA-DEMO-003",
      "preferredChannel": "whatsapp",
      "doNotContact": false,
      "unsubscribedFromMarketing": false
    },
    {
      "id": "C004",
      "companyId": "E004",
      "name": "Comprador Demo 04",
      "email": "comprador04@example.com",
      "whatsappMockId": "WA-DEMO-004",
      "preferredChannel": "whatsapp",
      "doNotContact": false,
      "unsubscribedFromMarketing": false
    },
    {
      "id": "C005",
      "companyId": "E005",
      "name": "Comprador Demo 05",
      "email": "comprador05@example.com",
      "whatsappMockId": "WA-DEMO-005",
      "preferredChannel": "whatsapp",
      "doNotContact": false,
      "unsubscribedFromMarketing": false
    },
    {
      "id": "C006",
      "companyId": "E006",
      "name": "Comprador Demo 06",
      "email": "comprador06@example.com",
      "whatsappMockId": "WA-DEMO-006",
      "preferredChannel": "whatsapp",
      "doNotContact": false,
      "unsubscribedFromMarketing": false
    },
    {
      "id": "C007",
      "companyId": "E007",
      "name": "Comprador Demo 07",
      "email": "comprador07@example.com",
      "whatsappMockId": "WA-DEMO-007",
      "preferredChannel": "whatsapp",
      "doNotContact": false,
      "unsubscribedFromMarketing": false
    },
    {
      "id": "C008",
      "companyId": "E008",
      "name": "Comprador Demo 08",
      "email": "comprador08@example.com",
      "whatsappMockId": "WA-DEMO-008",
      "preferredChannel": "whatsapp",
      "doNotContact": false,
      "unsubscribedFromMarketing": false
    }
  ],
  "leads": [
    {
      "id": "L001",
      "contactId": "C001",
      "source": "site",
      "campaign": "demo-outubro",
      "interest": "Reposição demonstrativa",
      "status": "converted",
      "ownerId": "U002",
      "createdAt": "2026-10-01T09:00:00-03:00",
      "convertedOpportunityId": "O001"
    },
    {
      "id": "L002",
      "contactId": "C002",
      "source": "whatsapp",
      "campaign": null,
      "interest": "Reposição demonstrativa",
      "status": "converted",
      "ownerId": "U003",
      "createdAt": "2026-10-02T09:00:00-03:00",
      "convertedOpportunityId": "O002"
    },
    {
      "id": "L003",
      "contactId": "C003",
      "source": "email",
      "campaign": null,
      "interest": "Reposição demonstrativa",
      "status": "converted",
      "ownerId": "U002",
      "createdAt": "2026-10-03T09:00:00-03:00",
      "convertedOpportunityId": "O003"
    },
    {
      "id": "L004",
      "contactId": "C004",
      "source": "referral",
      "campaign": null,
      "interest": "Projeto personalizado",
      "status": "converted",
      "ownerId": "U003",
      "createdAt": "2026-10-04T09:00:00-03:00",
      "convertedOpportunityId": "O004"
    },
    {
      "id": "L005",
      "contactId": "C005",
      "source": "site",
      "campaign": null,
      "interest": "Reposição demonstrativa",
      "status": "converted",
      "ownerId": "U002",
      "createdAt": "2026-10-05T09:00:00-03:00",
      "convertedOpportunityId": "O005"
    },
    {
      "id": "L006",
      "contactId": "C006",
      "source": "whatsapp",
      "campaign": null,
      "interest": "Reposição demonstrativa",
      "status": "converted",
      "ownerId": "U003",
      "createdAt": "2026-10-06T09:00:00-03:00",
      "convertedOpportunityId": "O006"
    },
    {
      "id": "L007",
      "contactId": "C007",
      "source": "email",
      "campaign": null,
      "interest": "Reposição demonstrativa",
      "status": "converted",
      "ownerId": "U002",
      "createdAt": "2026-10-07T09:00:00-03:00",
      "convertedOpportunityId": "O007"
    },
    {
      "id": "L008",
      "contactId": "C008",
      "source": "referral",
      "campaign": null,
      "interest": "Reposição demonstrativa",
      "status": "converted",
      "ownerId": "U003",
      "createdAt": "2026-10-07T09:00:00-03:00",
      "convertedOpportunityId": "O008"
    }
  ],
  "opportunities": [
    {
      "id": "O001",
      "companyId": "E001",
      "contactId": "C001",
      "title": "Solicitação demonstrativa 01",
      "stage": "new",
      "ownerId": "U002",
      "estimatedValueCents": 250000,
      "technicalStatus": "approved_demo",
      "createdAt": "2026-10-01T09:00:00-03:00",
      "stageEnteredAt": "2026-10-08T10:00:00-03:00",
      "closedAt": null,
      "lostReason": null,
      "version": 1
    },
    {
      "id": "O002",
      "companyId": "E002",
      "contactId": "C002",
      "title": "Solicitação demonstrativa 02",
      "stage": "quoting",
      "ownerId": "U003",
      "estimatedValueCents": 215100,
      "technicalStatus": "approved_demo",
      "createdAt": "2026-10-02T09:00:00-03:00",
      "stageEnteredAt": "2026-10-08T10:00:00-03:00",
      "closedAt": null,
      "lostReason": null,
      "version": 1
    },
    {
      "id": "O003",
      "companyId": "E003",
      "contactId": "C003",
      "title": "Solicitação demonstrativa 03",
      "stage": "negotiation",
      "ownerId": "U002",
      "estimatedValueCents": 208560,
      "technicalStatus": "approved_demo",
      "createdAt": "2026-10-03T09:00:00-03:00",
      "stageEnteredAt": "2026-10-08T10:00:00-03:00",
      "closedAt": null,
      "lostReason": null,
      "version": 1
    },
    {
      "id": "O004",
      "companyId": "E004",
      "contactId": "C004",
      "title": "Solicitação demonstrativa 04",
      "stage": "qualification",
      "ownerId": "U003",
      "estimatedValueCents": 400000,
      "technicalStatus": "pending",
      "createdAt": "2026-10-04T09:00:00-03:00",
      "stageEnteredAt": "2026-10-08T10:00:00-03:00",
      "closedAt": null,
      "lostReason": null,
      "version": 1
    },
    {
      "id": "O005",
      "companyId": "E005",
      "contactId": "C005",
      "title": "Solicitação demonstrativa 05",
      "stage": "quote_sent",
      "ownerId": "U002",
      "estimatedValueCents": 150000,
      "technicalStatus": "approved_demo",
      "createdAt": "2026-10-05T09:00:00-03:00",
      "stageEnteredAt": "2026-10-08T10:00:00-03:00",
      "closedAt": null,
      "lostReason": null,
      "version": 1
    },
    {
      "id": "O006",
      "companyId": "E006",
      "contactId": "C006",
      "title": "Solicitação demonstrativa 06",
      "stage": "quote_sent",
      "ownerId": "U003",
      "estimatedValueCents": 348540,
      "technicalStatus": "approved_demo",
      "createdAt": "2026-10-06T09:00:00-03:00",
      "stageEnteredAt": "2026-10-08T10:00:00-03:00",
      "closedAt": null,
      "lostReason": null,
      "version": 1
    },
    {
      "id": "O007",
      "companyId": "E007",
      "contactId": "C007",
      "title": "Solicitação demonstrativa 07",
      "stage": "won",
      "ownerId": "U002",
      "estimatedValueCents": 120000,
      "technicalStatus": "approved_demo",
      "createdAt": "2026-10-07T09:00:00-03:00",
      "stageEnteredAt": "2026-10-08T10:00:00-03:00",
      "closedAt": "2026-10-09T11:00:00-03:00",
      "lostReason": null,
      "version": 1
    },
    {
      "id": "O008",
      "companyId": "E008",
      "contactId": "C008",
      "title": "Solicitação demonstrativa 08",
      "stage": "lost",
      "ownerId": "U003",
      "estimatedValueCents": 90000,
      "technicalStatus": "approved_demo",
      "createdAt": "2026-10-07T09:00:00-03:00",
      "stageEnteredAt": "2026-10-08T10:00:00-03:00",
      "closedAt": "2026-10-09T11:00:00-03:00",
      "lostReason": "Prazo",
      "version": 1
    }
  ],
  "products": [
    {
      "id": "P001",
      "sku": "DEMO-MW-001",
      "name": "Chicote padrão demonstrativo",
      "category": "Chicotes",
      "unit": "un",
      "unitPriceCents": 85000,
      "availability": "Disponibilidade simulada",
      "active": true,
      "requiresTechnicalApproval": false,
      "knowledgeId": "K001",
      "application": "Somente cenário fictício; nenhuma compatibilidade real declarada"
    },
    {
      "id": "P002",
      "sku": "DEMO-MW-002",
      "name": "Conector demonstrativo",
      "category": "Componentes",
      "unit": "un",
      "unitPriceCents": 12000,
      "availability": "Disponibilidade simulada",
      "active": true,
      "requiresTechnicalApproval": false,
      "knowledgeId": "K001",
      "application": "Somente cenário fictício; nenhuma compatibilidade real declarada"
    },
    {
      "id": "P003",
      "sku": "DEMO-MW-003",
      "name": "Kit de reparo demonstrativo",
      "category": "Acessórios",
      "unit": "un",
      "unitPriceCents": 30000,
      "availability": "Disponibilidade simulada",
      "active": true,
      "requiresTechnicalApproval": false,
      "knowledgeId": "K001",
      "application": "Somente cenário fictício; nenhuma compatibilidade real declarada"
    },
    {
      "id": "P004",
      "sku": "DEMO-MW-004",
      "name": "Chicote sob projeto demonstrativo",
      "category": "Projeto OEM",
      "unit": "un",
      "unitPriceCents": null,
      "availability": "Consultar equipe",
      "active": true,
      "requiresTechnicalApproval": true,
      "knowledgeId": "K001",
      "application": "Somente cenário fictício; nenhuma compatibilidade real declarada"
    },
    {
      "id": "P005",
      "sku": "DEMO-MW-005",
      "name": "Serviço de engenharia reversa demonstrativo",
      "category": "Engenharia",
      "unit": "un",
      "unitPriceCents": null,
      "availability": "Consultar equipe",
      "active": true,
      "requiresTechnicalApproval": true,
      "knowledgeId": "K001",
      "application": "Somente cenário fictício; nenhuma compatibilidade real declarada"
    },
    {
      "id": "P006",
      "sku": "DEMO-MW-006",
      "name": "Conjunto auxiliar demonstrativo",
      "category": "Chicotes",
      "unit": "un",
      "unitPriceCents": 50000,
      "availability": "Disponibilidade simulada",
      "active": true,
      "requiresTechnicalApproval": false,
      "knowledgeId": "K001",
      "application": "Somente cenário fictício; nenhuma compatibilidade real declarada"
    }
  ],
  "quotes": [
    {
      "id": "Q001",
      "number": "MW-DEMO-2026-001",
      "opportunityId": "O002",
      "currentVersionId": "Q001-V1",
      "createdAt": "2026-10-08T10:00:00-03:00"
    },
    {
      "id": "Q002",
      "number": "MW-DEMO-2026-002",
      "opportunityId": "O003",
      "currentVersionId": "Q002-V1",
      "createdAt": "2026-10-08T10:00:00-03:00"
    },
    {
      "id": "Q003",
      "number": "MW-DEMO-2026-003",
      "opportunityId": "O005",
      "currentVersionId": "Q003-V1",
      "createdAt": "2026-10-08T10:00:00-03:00"
    },
    {
      "id": "Q004",
      "number": "MW-DEMO-2026-004",
      "opportunityId": "O006",
      "currentVersionId": "Q004-V1",
      "createdAt": "2026-10-08T10:00:00-03:00"
    },
    {
      "id": "Q005",
      "number": "MW-DEMO-2026-005",
      "opportunityId": "O007",
      "currentVersionId": "Q005-V1",
      "createdAt": "2026-10-08T10:00:00-03:00"
    }
  ],
  "quoteVersions": [
    {
      "id": "Q001-V1",
      "quoteId": "Q001",
      "revision": 1,
      "status": "draft",
      "approvalStatus": "not_required",
      "lines": [
        {
          "productId": "P001",
          "skuSnapshot": "DEMO-MW-001",
          "nameSnapshot": "Chicote padrão demonstrativo",
          "quantity": 2,
          "unitPriceCents": 85000,
          "discountBps": 500,
          "grossCents": 170000,
          "discountCents": 8500,
          "netCents": 161500
        },
        {
          "productId": "P002",
          "skuSnapshot": "DEMO-MW-002",
          "nameSnapshot": "Conector demonstrativo",
          "quantity": 4,
          "unitPriceCents": 12000,
          "discountBps": 500,
          "grossCents": 48000,
          "discountCents": 2400,
          "netCents": 45600
        }
      ],
      "freightCents": 8000,
      "freightPending": false,
      "totalCents": 215100,
      "validUntil": "2026-10-16T23:59:59-03:00",
      "paymentTerms": "Condição demonstrativa a confirmar",
      "deliveryTerms": "Prazo demonstrativo sujeito à validação",
      "technicalApproved": true,
      "createdBy": "U003",
      "sentAt": null,
      "acceptedAt": null,
      "version": 1
    },
    {
      "id": "Q002-V1",
      "quoteId": "Q002",
      "revision": 1,
      "status": "draft",
      "approvalStatus": "pending",
      "lines": [
        {
          "productId": "P001",
          "skuSnapshot": "DEMO-MW-001",
          "nameSnapshot": "Chicote padrão demonstrativo",
          "quantity": 2,
          "unitPriceCents": 85000,
          "discountBps": 800,
          "grossCents": 170000,
          "discountCents": 13600,
          "netCents": 156400
        },
        {
          "productId": "P002",
          "skuSnapshot": "DEMO-MW-002",
          "nameSnapshot": "Conector demonstrativo",
          "quantity": 4,
          "unitPriceCents": 12000,
          "discountBps": 800,
          "grossCents": 48000,
          "discountCents": 3840,
          "netCents": 44160
        }
      ],
      "freightCents": 8000,
      "freightPending": false,
      "totalCents": 208560,
      "validUntil": "2026-10-16T23:59:59-03:00",
      "paymentTerms": "Condição demonstrativa a confirmar",
      "deliveryTerms": "Prazo demonstrativo sujeito à validação",
      "technicalApproved": true,
      "createdBy": "U002",
      "sentAt": null,
      "acceptedAt": null,
      "version": 1
    },
    {
      "id": "Q003-V1",
      "quoteId": "Q003",
      "revision": 1,
      "status": "sent",
      "approvalStatus": "not_required",
      "lines": [
        {
          "productId": "P003",
          "skuSnapshot": "DEMO-MW-003",
          "nameSnapshot": "Kit de reparo demonstrativo",
          "quantity": 5,
          "unitPriceCents": 30000,
          "discountBps": 0,
          "grossCents": 150000,
          "discountCents": 0,
          "netCents": 150000
        }
      ],
      "freightCents": 0,
      "freightPending": false,
      "totalCents": 150000,
      "validUntil": "2026-10-16T23:59:59-03:00",
      "paymentTerms": "Condição demonstrativa a confirmar",
      "deliveryTerms": "Prazo demonstrativo sujeito à validação",
      "technicalApproved": true,
      "createdBy": "U002",
      "sentAt": "2026-10-08T12:00:00-03:00",
      "acceptedAt": null,
      "version": 1
    },
    {
      "id": "Q004-V1",
      "quoteId": "Q004",
      "revision": 1,
      "status": "expired",
      "approvalStatus": "not_required",
      "lines": [
        {
          "productId": "P001",
          "skuSnapshot": "DEMO-MW-001",
          "nameSnapshot": "Chicote padrão demonstrativo",
          "quantity": 4,
          "unitPriceCents": 85000,
          "discountBps": 0,
          "grossCents": 340000,
          "discountCents": 0,
          "netCents": 340000
        }
      ],
      "freightCents": 8540,
      "freightPending": false,
      "totalCents": 348540,
      "validUntil": "2026-10-08T23:59:59-03:00",
      "paymentTerms": "Condição demonstrativa a confirmar",
      "deliveryTerms": "Prazo demonstrativo sujeito à validação",
      "technicalApproved": true,
      "createdBy": "U003",
      "sentAt": "2026-10-08T12:00:00-03:00",
      "acceptedAt": null,
      "version": 1
    },
    {
      "id": "Q005-V1",
      "quoteId": "Q005",
      "revision": 1,
      "status": "accepted",
      "approvalStatus": "not_required",
      "lines": [
        {
          "productId": "P003",
          "skuSnapshot": "DEMO-MW-003",
          "nameSnapshot": "Kit de reparo demonstrativo",
          "quantity": 4,
          "unitPriceCents": 30000,
          "discountBps": 0,
          "grossCents": 120000,
          "discountCents": 0,
          "netCents": 120000
        }
      ],
      "freightCents": 0,
      "freightPending": false,
      "totalCents": 120000,
      "validUntil": "2026-10-16T23:59:59-03:00",
      "paymentTerms": "Condição demonstrativa a confirmar",
      "deliveryTerms": "Prazo demonstrativo sujeito à validação",
      "technicalApproved": true,
      "createdBy": "U002",
      "sentAt": "2026-10-08T12:00:00-03:00",
      "acceptedAt": "2026-10-09T10:55:00-03:00",
      "version": 1
    }
  ],
  "approvals": [
    {
      "id": "AP001",
      "quoteVersionId": "Q002-V1",
      "requestedBy": "U002",
      "decidedBy": null,
      "status": "pending",
      "reason": "Solicitação de desconto de 8% para cenário demonstrativo",
      "requestedAt": "2026-10-09T14:30:00-03:00",
      "decidedAt": null
    }
  ],
  "conversations": [
    {
      "id": "CV001",
      "contactId": "C001",
      "opportunityId": "O001",
      "ownerId": "U002",
      "state": "waiting_team",
      "aiMode": "copilot",
      "lastInboundAt": "2026-10-09T14:00:00-03:00",
      "unreadCount": 1
    },
    {
      "id": "CV002",
      "contactId": "C002",
      "opportunityId": "O002",
      "ownerId": "U003",
      "state": "waiting_team",
      "aiMode": "copilot",
      "lastInboundAt": "2026-10-09T14:00:00-03:00",
      "unreadCount": 0
    },
    {
      "id": "CV003",
      "contactId": "C003",
      "opportunityId": "O003",
      "ownerId": "U002",
      "state": "waiting_team",
      "aiMode": "copilot",
      "lastInboundAt": "2026-10-09T14:00:00-03:00",
      "unreadCount": 0
    },
    {
      "id": "CV004",
      "contactId": "C004",
      "opportunityId": "O004",
      "ownerId": "U003",
      "state": "waiting_team",
      "aiMode": "paused",
      "lastInboundAt": "2026-10-09T14:00:00-03:00",
      "unreadCount": 1
    },
    {
      "id": "CV005",
      "contactId": "C005",
      "opportunityId": "O005",
      "ownerId": "U002",
      "state": "waiting_team",
      "aiMode": "copilot",
      "lastInboundAt": "2026-10-09T14:00:00-03:00",
      "unreadCount": 0
    },
    {
      "id": "CV006",
      "contactId": "C006",
      "opportunityId": "O006",
      "ownerId": "U003",
      "state": "waiting_team",
      "aiMode": "copilot",
      "lastInboundAt": "2026-10-07T10:00:00-03:00",
      "unreadCount": 0
    },
    {
      "id": "CV007",
      "contactId": "C007",
      "opportunityId": "O007",
      "ownerId": "U002",
      "state": "closed",
      "aiMode": "copilot",
      "lastInboundAt": "2026-10-09T14:00:00-03:00",
      "unreadCount": 0
    },
    {
      "id": "CV008",
      "contactId": "C008",
      "opportunityId": "O008",
      "ownerId": "U003",
      "state": "closed",
      "aiMode": "copilot",
      "lastInboundAt": "2026-10-09T14:00:00-03:00",
      "unreadCount": 0
    }
  ],
  "messages": [
    {
      "id": "M001",
      "conversationId": "CV001",
      "channel": "whatsapp",
      "direction": "inbound",
      "authorId": null,
      "body": "Olá, gostaria de uma cotação para itens do catálogo demonstrativo.",
      "deliveryStatus": "received",
      "createdAt": "2026-10-09T14:00:00-03:00",
      "quoteVersionId": null,
      "clientRequestId": null,
      "providerEventId": "evt-in-1"
    },
    {
      "id": "M002",
      "conversationId": "CV002",
      "channel": "whatsapp",
      "direction": "inbound",
      "authorId": null,
      "body": "Olá, gostaria de uma cotação para itens do catálogo demonstrativo.",
      "deliveryStatus": "received",
      "createdAt": "2026-10-09T14:00:00-03:00",
      "quoteVersionId": null,
      "clientRequestId": null,
      "providerEventId": "evt-in-2"
    },
    {
      "id": "M003",
      "conversationId": "CV003",
      "channel": "email",
      "direction": "inbound",
      "authorId": null,
      "body": "Olá, gostaria de uma cotação para itens do catálogo demonstrativo.",
      "deliveryStatus": "received",
      "createdAt": "2026-10-09T14:00:00-03:00",
      "quoteVersionId": null,
      "clientRequestId": null,
      "providerEventId": "evt-in-3"
    },
    {
      "id": "M004",
      "conversationId": "CV004",
      "channel": "whatsapp",
      "direction": "inbound",
      "authorId": null,
      "body": "Preciso de um chicote para um equipamento sem referência. Como identificamos?",
      "deliveryStatus": "received",
      "createdAt": "2026-10-09T14:00:00-03:00",
      "quoteVersionId": null,
      "clientRequestId": null,
      "providerEventId": "evt-in-4"
    },
    {
      "id": "M005",
      "conversationId": "CV005",
      "channel": "whatsapp",
      "direction": "inbound",
      "authorId": null,
      "body": "Olá, gostaria de uma cotação para itens do catálogo demonstrativo.",
      "deliveryStatus": "received",
      "createdAt": "2026-10-09T14:00:00-03:00",
      "quoteVersionId": null,
      "clientRequestId": null,
      "providerEventId": "evt-in-5"
    },
    {
      "id": "M006",
      "conversationId": "CV006",
      "channel": "email",
      "direction": "inbound",
      "authorId": null,
      "body": "Olá, gostaria de uma cotação para itens do catálogo demonstrativo.",
      "deliveryStatus": "received",
      "createdAt": "2026-10-07T10:00:00-03:00",
      "quoteVersionId": null,
      "clientRequestId": null,
      "providerEventId": "evt-in-6"
    },
    {
      "id": "M007",
      "conversationId": "CV007",
      "channel": "whatsapp",
      "direction": "inbound",
      "authorId": null,
      "body": "Olá, gostaria de uma cotação para itens do catálogo demonstrativo.",
      "deliveryStatus": "received",
      "createdAt": "2026-10-09T14:00:00-03:00",
      "quoteVersionId": null,
      "clientRequestId": null,
      "providerEventId": "evt-in-7"
    },
    {
      "id": "M008",
      "conversationId": "CV008",
      "channel": "whatsapp",
      "direction": "inbound",
      "authorId": null,
      "body": "Olá, gostaria de uma cotação para itens do catálogo demonstrativo.",
      "deliveryStatus": "received",
      "createdAt": "2026-10-09T14:00:00-03:00",
      "quoteVersionId": null,
      "clientRequestId": null,
      "providerEventId": "evt-in-8"
    },
    {
      "id": "MS005",
      "conversationId": "CV005",
      "channel": "email",
      "direction": "outbound",
      "authorId": "U002",
      "body": "Segue a cotação demonstrativa para sua avaliação.",
      "deliveryStatus": "sent",
      "createdAt": "2026-10-08T12:00:00-03:00",
      "quoteVersionId": "Q003-V1",
      "clientRequestId": "seed-send-Q003",
      "providerEventId": "seed-provider-Q003"
    },
    {
      "id": "MS006",
      "conversationId": "CV006",
      "channel": "email",
      "direction": "outbound",
      "authorId": "U002",
      "body": "Segue a cotação demonstrativa para sua avaliação.",
      "deliveryStatus": "sent",
      "createdAt": "2026-10-08T12:00:00-03:00",
      "quoteVersionId": "Q004-V1",
      "clientRequestId": "seed-send-Q004",
      "providerEventId": "seed-provider-Q004"
    },
    {
      "id": "MS007",
      "conversationId": "CV007",
      "channel": "email",
      "direction": "outbound",
      "authorId": "U002",
      "body": "Segue a cotação demonstrativa para sua avaliação.",
      "deliveryStatus": "sent",
      "createdAt": "2026-10-08T12:00:00-03:00",
      "quoteVersionId": "Q005-V1",
      "clientRequestId": "seed-send-Q005",
      "providerEventId": "seed-provider-Q005"
    }
  ],
  "tasks": [
    {
      "id": "T001",
      "opportunityId": "O001",
      "ownerId": "U002",
      "type": "follow_up",
      "title": "Retornar ao comprador",
      "dueAt": "2026-10-09T10:00:00-03:00",
      "status": "open",
      "automationKey": null
    },
    {
      "id": "T002",
      "opportunityId": "O002",
      "ownerId": "U003",
      "type": "follow_up",
      "title": "Retornar ao comprador",
      "dueAt": "2026-10-09T10:00:00-03:00",
      "status": "open",
      "automationKey": null
    },
    {
      "id": "T003",
      "opportunityId": "O003",
      "ownerId": "U002",
      "type": "follow_up",
      "title": "Retornar ao comprador",
      "dueAt": "2026-10-12T10:00:00-03:00",
      "status": "open",
      "automationKey": null
    },
    {
      "id": "T004",
      "opportunityId": "O004",
      "ownerId": "U003",
      "type": "technical_review",
      "title": "Confirmar aplicação técnica",
      "dueAt": "2026-10-12T10:00:00-03:00",
      "status": "open",
      "automationKey": null
    },
    {
      "id": "T005",
      "opportunityId": "O005",
      "ownerId": "U002",
      "type": "follow_up",
      "title": "Retornar ao comprador",
      "dueAt": "2026-10-12T10:00:00-03:00",
      "status": "open",
      "automationKey": null
    },
    {
      "id": "T006",
      "opportunityId": "O006",
      "ownerId": "U003",
      "type": "follow_up",
      "title": "Retornar ao comprador",
      "dueAt": "2026-10-12T10:00:00-03:00",
      "status": "open",
      "automationKey": null
    }
  ],
  "activities": [
    {
      "id": "EV001",
      "entityType": "opportunity",
      "entityId": "O001",
      "actorId": "U002",
      "action": "created",
      "before": null,
      "after": {
        "stage": "new"
      },
      "createdAt": "2026-10-01T09:00:00-03:00",
      "correlationId": "seed-1"
    },
    {
      "id": "EV002",
      "entityType": "opportunity",
      "entityId": "O002",
      "actorId": "U003",
      "action": "created",
      "before": null,
      "after": {
        "stage": "new"
      },
      "createdAt": "2026-10-02T09:00:00-03:00",
      "correlationId": "seed-2"
    },
    {
      "id": "EV003",
      "entityType": "opportunity",
      "entityId": "O003",
      "actorId": "U002",
      "action": "created",
      "before": null,
      "after": {
        "stage": "new"
      },
      "createdAt": "2026-10-03T09:00:00-03:00",
      "correlationId": "seed-3"
    },
    {
      "id": "EV004",
      "entityType": "opportunity",
      "entityId": "O004",
      "actorId": "U003",
      "action": "created",
      "before": null,
      "after": {
        "stage": "new"
      },
      "createdAt": "2026-10-04T09:00:00-03:00",
      "correlationId": "seed-4"
    },
    {
      "id": "EV005",
      "entityType": "opportunity",
      "entityId": "O005",
      "actorId": "U002",
      "action": "created",
      "before": null,
      "after": {
        "stage": "new"
      },
      "createdAt": "2026-10-05T09:00:00-03:00",
      "correlationId": "seed-5"
    },
    {
      "id": "EV006",
      "entityType": "opportunity",
      "entityId": "O006",
      "actorId": "U003",
      "action": "created",
      "before": null,
      "after": {
        "stage": "new"
      },
      "createdAt": "2026-10-06T09:00:00-03:00",
      "correlationId": "seed-6"
    },
    {
      "id": "EV007",
      "entityType": "opportunity",
      "entityId": "O007",
      "actorId": "U002",
      "action": "created",
      "before": null,
      "after": {
        "stage": "new"
      },
      "createdAt": "2026-10-07T09:00:00-03:00",
      "correlationId": "seed-7"
    },
    {
      "id": "EV008",
      "entityType": "opportunity",
      "entityId": "O008",
      "actorId": "U003",
      "action": "created",
      "before": null,
      "after": {
        "stage": "new"
      },
      "createdAt": "2026-10-07T09:00:00-03:00",
      "correlationId": "seed-8"
    }
  ],
  "knowledgeDocuments": [
    {
      "id": "K001",
      "title": "Catálogo demonstrativo",
      "layer": "approved_knowledge",
      "version": 1,
      "status": "approved",
      "approvedBy": "U004",
      "content": "SKUs DEMO são fictícios. Não afirmar aplicação em máquina real. Preços exclusivamente para demonstração."
    },
    {
      "id": "K002",
      "title": "Triagem comercial demonstrativa",
      "layer": "approved_knowledge",
      "version": 1,
      "status": "approved",
      "approvedBy": "U001",
      "content": "Perguntar referência, quantidade, aplicação e prazo. Sem referência técnica confirmada, encaminhar ao técnico."
    },
    {
      "id": "K003",
      "title": "Rascunho não aprovado",
      "layer": "approved_knowledge",
      "version": 1,
      "status": "draft",
      "approvedBy": null,
      "content": "Este documento não deve alimentar sugestões."
    }
  ],
  "automationRules": [
    {
      "id": "A01",
      "trigger": "lead.created",
      "conditions": "Sem responsável",
      "action": "round_robin_and_task",
      "active": true
    },
    {
      "id": "A02",
      "trigger": "message.received",
      "conditions": "Modo automático e primeira entrada",
      "action": "scripted_triage",
      "active": false
    },
    {
      "id": "A03",
      "trigger": "quote.sent",
      "conditions": "Sem retorno pendente para revisão",
      "action": "create_follow_up_task",
      "active": true
    },
    {
      "id": "A04",
      "trigger": "clock.advanced",
      "conditions": "Validade vencida",
      "action": "expire_and_notify",
      "active": true
    },
    {
      "id": "A05",
      "trigger": "quote.approval_requested",
      "conditions": "Acima da alçada",
      "action": "notify_manager",
      "active": true
    }
  ],
  "automationRuns": [],
  "integrations": [
    {
      "id": "I1",
      "channel": "site",
      "mode": "mock",
      "state": "connected",
      "lastSyncAt": null,
      "lastError": null
    },
    {
      "id": "I2",
      "channel": "whatsapp",
      "mode": "mock",
      "state": "connected",
      "lastSyncAt": null,
      "lastError": null
    },
    {
      "id": "I3",
      "channel": "email",
      "mode": "mock",
      "state": "connected",
      "lastSyncAt": null,
      "lastError": null
    },
    {
      "id": "I4",
      "channel": "erp",
      "mode": "mock",
      "state": "connected",
      "lastSyncAt": "2026-10-13T12:00:00-03:00",
      "lastError": null
    },
    {
      "id": "I5",
      "channel": "instagram",
      "mode": "mock",
      "state": "connected",
      "lastSyncAt": "2026-10-13T11:00:00-03:00",
      "lastError": null
    },
    {
      "id": "I6",
      "channel": "landing_page",
      "mode": "mock",
      "state": "connected",
      "lastSyncAt": "2026-10-13T11:00:00-03:00",
      "lastError": null
    }
  ],
  "notifications": [
    {
      "id": "N001",
      "recipientId": "U001",
      "title": "Aprovação pendente",
      "message": "Cotação MW-DEMO-2026-002 aguarda aprovação de desconto de 8%.",
      "linkRoute": "/cotacoes",
      "read": false,
      "createdAt": "2026-10-09T14:30:00-03:00"
    },
    {
      "id": "N002",
      "recipientId": "U002",
      "title": "Nova mensagem recebida",
      "message": "Comprador Demo 01 enviou mensagem pelo WhatsApp.",
      "linkRoute": "/atendimento",
      "read": false,
      "createdAt": "2026-10-09T14:00:00-03:00"
    }
  ],
  "scenarios": [
    {
      "id": "C01",
      "enabled": true
    },
    {
      "id": "C02",
      "enabled": true
    },
    {
      "id": "C03",
      "enabled": true
    },
    {
      "id": "C04",
      "enabled": true
    },
    {
      "id": "C05",
      "enabled": true
    },
    {
      "id": "C06",
      "enabled": true
    },
    {
      "id": "C07",
      "enabled": true
    },
    {
      "id": "C08",
      "enabled": true
    },
    {
      "id": "C09",
      "enabled": true
    },
    {
      "id": "C10",
      "enabled": true
    },
    {
      "id": "C11",
      "enabled": true
    },
    {
      "id": "C12",
      "enabled": true
    },
    {
      "id": "C13",
      "enabled": true
    },
    {
      "id": "C14",
      "enabled": true
    },
    {
      "id": "C15",
      "enabled": true
    },
    {
      "id": "C16",
      "enabled": true
    }
  ],
  "expectedInitialMetrics": {
    "openOpportunities": 6,
    "openValueCents": 1572200,
    "wonOpportunities": 1,
    "wonValueCents": 120000,
    "lostOpportunities": 1,
    "closedWinRate": 0.5,
    "overdueTasks": 2
  },
  "demoNewLead": {
    "eventId": "scenario-new-lead-001",
    "name": "Comprador Roteiro Demo",
    "company": "Agro Roteiro Demo",
    "email": "roteiro@example.com",
    "whatsappMockId": "WA-DEMO-ROTEIRO",
    "source": "site",
    "interest": "Duas unidades DEMO-MW-001 e quatro DEMO-MW-002",
    "technicalStatus": "approved_demo"
  },
  "demoResponses": {
    "summary": "Comprador solicita duas unidades de chicote demonstrativo e quatro conectores. Confirmar prazo e destino antes de enviar.",
    "clarification": "Você pode informar a referência da peça, a quantidade e a aplicação desejada?",
    "handoff": "Vou encaminhar sua solicitação para nossa equipe confirmar a aplicação antes de preparar a cotação.",
    "discountRequest": "É possível ajustar para 8% de desconto?",
    "acceptance": "Aceito a revisão vigente apresentada no simulador."
  },
  "simulatedErrors": {
    "failWhatsApp": false,
    "failEmail": false,
    "erpTimeout": false
  },
  "touchpoints": [
    {
      "id": "TP001",
      "contactId": "C001",
      "companyId": "E001",
      "channel": "site",
      "campaign": "demo-outubro",
      "pageOrAd": "megawhip.com.br/catalogo",
      "details": "Entrada inicial via formulário do site solicitando reposição canavieira",
      "createdAt": "2026-10-01T09:00:00-03:00"
    },
    {
      "id": "TP002",
      "contactId": "C001",
      "companyId": "E001",
      "channel": "catalog",
      "pageOrAd": "catalogo-interativo-colheitadeiras",
      "details": "Cliente navegou no catálogo e selecionou chicote CH570 (DEMO-MW-001)",
      "selectedProducts": [
        {
          "sku": "DEMO-MW-001",
          "quantity": 2
        }
      ],
      "machineModel": "Colheitadeira John Deere CH570",
      "createdAt": "2026-10-08T14:30:00-03:00"
    }
  ],
  "erpStock": [
    {
      "sku": "DEMO-MW-001",
      "name": "Chicote padrão demonstrativo",
      "physicalStock": 18,
      "availableStock": 14,
      "reservedStock": 4,
      "warehouse": "Depósito Matriz SP",
      "unit": "un",
      "lastSyncAt": "2026-10-09T15:00:00-03:00",
      "erpStatus": "synced"
    },
    {
      "sku": "DEMO-MW-002",
      "name": "Conector demonstrativo",
      "physicalStock": 120,
      "availableStock": 112,
      "reservedStock": 8,
      "warehouse": "Depósito Matriz SP",
      "unit": "un",
      "lastSyncAt": "2026-10-09T15:00:00-03:00",
      "erpStatus": "synced"
    },
    {
      "sku": "DEMO-MW-003",
      "name": "Kit de reparo demonstrativo",
      "physicalStock": 35,
      "availableStock": 30,
      "reservedStock": 5,
      "warehouse": "Depósito Linha Pesada",
      "unit": "un",
      "lastSyncAt": "2026-10-09T15:00:00-03:00",
      "erpStatus": "synced"
    },
    {
      "sku": "DEMO-MW-004",
      "name": "Chicote sob projeto demonstrativo",
      "physicalStock": 0,
      "availableStock": 0,
      "reservedStock": 0,
      "warehouse": "Fabricação Sob Demanda",
      "unit": "un",
      "lastSyncAt": "2026-10-09T15:00:00-03:00",
      "erpStatus": "synced"
    },
    {
      "sku": "DEMO-MW-005",
      "name": "Serviço de engenharia reversa demonstrativo",
      "physicalStock": 0,
      "availableStock": 0,
      "reservedStock": 0,
      "warehouse": "Engenharia / Serviço",
      "unit": "un",
      "lastSyncAt": "2026-10-09T15:00:00-03:00",
      "erpStatus": "synced"
    },
    {
      "sku": "DEMO-MW-006",
      "name": "Conjunto auxiliar demonstrativo",
      "physicalStock": 8,
      "availableStock": 6,
      "reservedStock": 2,
      "warehouse": "Depósito Matriz SP",
      "unit": "un",
      "lastSyncAt": "2026-10-09T15:00:00-03:00",
      "erpStatus": "synced"
    }
  ],
  "erpOrderSyncs": [
    {
      "id": "SYNC-001",
      "quoteId": "Q005",
      "opportunityId": "O007",
      "erpOrderId": "ERP-PED-2026-904",
      "status": "confirmed",
      "dispatchedAt": "2026-10-09T11:05:00-03:00",
      "confirmedAt": "2026-10-09T11:05:02-03:00",
      "correlationId": "corr-q005-seed"
    }
  ],
  "marketCalendar": [
    {
      "id": "CAL-001",
      "segment": "Cana de açúcar",
      "region": "Ribeirão Preto / SP",
      "cropOrCycle": "Entressafra e Manutenção Preventiva",
      "periodReference": "Outubro a Dezembro",
      "status": "active",
      "sourceDocument": "K004 - Calendário Técnico Canavieiro SP (Aprovado)",
      "reviewedBy": "U004 (Técnico Demo)",
      "validUntil": "2026-12-31T23:59:59-03:00",
      "opportunitySummary": "Janela prioritária para usinas e fornecedores revisarem chicotes elétricos de colheitadeiras antes da nova safra."
    },
    {
      "id": "CAL-002",
      "segment": "Grãos (Soja/Milho)",
      "region": "Sorriso / MT",
      "cropOrCycle": "Preparação de Plantio Safra Verão",
      "periodReference": "Setembro a Novembro",
      "status": "active",
      "sourceDocument": "K005 - Calendário Técnico Grãos MT (Aprovado)",
      "reviewedBy": "U004 (Técnico Demo)",
      "validUntil": "2026-11-30T23:59:59-03:00",
      "opportunitySummary": "Produtores e revendas demandam kits de reparo e chicotes auxiliares para tratores e plantadeiras em operação contínua."
    },
    {
      "id": "CAL-003",
      "segment": "Café",
      "region": "Sul de Minas / MG",
      "cropOrCycle": "Pós-colheita e Revisão Elétrica",
      "periodReference": "Agosto a Setembro",
      "status": "expired",
      "sourceDocument": "K006 - Calendário Cafeeiro (Revisão Vencida)",
      "reviewedBy": "U004 (Técnico Demo)",
      "validUntil": "2026-09-30T23:59:59-03:00",
      "opportunitySummary": "Período vencido. Exige validação da equipe técnica antes de gerar novas ações sazonais para este público."
    }
  ],
  "marketAlerts": [
    {
      "id": "ALT-001",
      "title": "Janela de Entressafra Canavieira em Ribeirão Preto / SP",
      "reason": "Usinas e grandes fornecedores na região de Ribeirão Preto estão na fase crítica de manutenção de chicotes de colheitadeiras (CH570).",
      "eligibleSegment": "Cana de açúcar",
      "eligibleRegion": "Ribeirão Preto / SP",
      "targetAudienceCount": 2,
      "sourceCalendarId": "CAL-001",
      "suggestedAction": "campaign",
      "targetProducts": [
        "DEMO-MW-001",
        "DEMO-MW-002"
      ],
      "draftSubject": "MegaWhip: Preparação de Chicotes Elétricos para Entressafra Canavieira",
      "draftMessage": "Olá! Com a aproximação da entressafra canavieira em Ribeirão Preto, verificamos a disponibilidade em estoque para chicotes de motor e conectores com pronta-entrega. Gostaria de receber o catálogo específico para suas colheitadeiras?",
      "stockStatus": "available_confirmed",
      "status": "new",
      "createdAt": "2026-10-09T15:00:00-03:00"
    },
    {
      "id": "ALT-002",
      "title": "Plantio de Soja e Demanda por Kits de Reparo em Sorriso / MT",
      "reason": "Pico de operação de tratores e plantadeiras na região de Sorriso. Alta demanda por kits de manutenção preventiva para evitar máquinas paradas.",
      "eligibleSegment": "Grãos (Soja/Milho)",
      "eligibleRegion": "Sorriso / MT",
      "targetAudienceCount": 1,
      "sourceCalendarId": "CAL-002",
      "suggestedAction": "commercial_contact",
      "targetProducts": [
        "DEMO-MW-003"
      ],
      "draftSubject": "Disponibilidade de Kits de Reparo Rápido para Safra de Grãos",
      "draftMessage": "Olá! Temos lotes de kits de reparo rápido DEMO-MW-003 disponíveis para envio imediato para suporte às plantadeiras na região de Sorriso.",
      "stockStatus": "available_confirmed",
      "status": "new",
      "createdAt": "2026-10-09T15:00:00-03:00"
    }
  ],
  "campaigns": [
    {
      "id": "CMP-001",
      "title": "Entressafra Canavieira SP 2026",
      "objective": "Cultivar relacionamento com usinas e frotas canavieiras com catálogo técnico focado na colheitadeira CH570",
      "targetSegment": "Cana de açúcar",
      "targetRegion": "Ribeirão Preto / SP",
      "channel": "email",
      "status": "draft",
      "audienceCount": 1,
      "excludedUnsubscribedCount": 0,
      "subject": "MegaWhip: Catálogo Técnico e Disponibilidade para Entressafra Canavieira",
      "messageBody": "Olá! Com o início da janela de revisão preventiva da safra canavieira em sua região, preparamos o catálogo técnico com chicotes reforçados para colheitadeiras e tratores pesados com estoque disponível no ERP.",
      "attachedCatalogSkuList": [
        "DEMO-MW-001",
        "DEMO-MW-002"
      ],
      "approvedBy": null,
      "approvedAt": null,
      "sentCount": 0,
      "responseCount": 0,
      "createdOpportunitiesCount": 0,
      "createdAt": "2026-10-13T12:00:00-03:00"
    }
  ]
};
