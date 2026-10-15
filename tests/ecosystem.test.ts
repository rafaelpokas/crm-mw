import test from "node:test";
import assert from "node:assert/strict";
import { execute, freshDatabase } from "../src/domain/engine";
test("catalog preserves selection and segment, repeated event does not duplicate", () => {
  const input = {
    name: "Cliente catálogo",
    email: "catalog@example.com",
    companyName: "Fazenda exemplo",
    source: "catalog",
    segment: "Grãos",
    region: "Londrina / PR",
    eventId: "catalog-1",
    catalogContext: {
      machineModel: "S670",
      selectedItems: [{ sku: "AXT20383", quantity: 3 }],
    },
  };
  const r = execute(freshDatabase(), "U001", "createLead", [input]);
  assert.equal(r.result.ok, true, r.result.error?.message);
  const l = r.result.data.lead;
  assert.equal(l.convertedOpportunityId, null);
  assert.equal(l.catalogContext.selectedItems[0].quantity, 3);
  assert.equal(r.db.touchpoints.at(-1)?.channel, "catalog");
  const again = execute(r.db, "U001", "createLead", [input]);
  assert.equal(again.result.data.lead.id, l.id);
  assert.equal(again.db.leads.length, r.db.leads.length);
  const bad = execute(r.db, "U001", "createLead", [
    {
      ...input,
      eventId: "bad",
      email: "other@example.com",
      catalogContext: { selectedItems: [{ sku: "A", quantity: 0 }] },
    },
  ]);
  assert.equal(bad.result.ok, false);
  assert.equal(bad.db, r.db);
});
test("campaign approval binds content, actual audience and suppression at execution", () => {
  let db = freshDatabase();
  const p = db.companies[0].segmentProfile!;
  const run = (cmd: string, ...args: any[]) => {
    const r = execute(db, "U001", cmd, args);
    db = r.db;
    return r.result;
  };
  const c = run("createCampaign", {
    title: "Relacionamento",
    messageBody: "Conheça o catálogo",
    subject: "Catálogo",
    targetSegment: p.mainSegment,
    targetRegion: p.region,
    channel: "email",
    audienceCount: 999,
  }).data;
  assert.notEqual(c.audienceCount, 999);
  assert.equal(run("executeCampaign", c.id).ok, false);
  assert.equal(run("approveCampaign", c.id).ok, true);
  const approved = db.campaigns.find((x) => x.id === c.id)!;
  const recipient = approved.approvedContactIds![0];
  assert.ok(recipient);
  const tampered = structuredClone(db);
  tampered.campaigns.find((x) => x.id === c.id)!.messageBody = "Alterada";
  assert.equal(
    execute(tampered, "U001", "executeCampaign", [c.id]).result.ok,
    false,
  );
  db.contacts.find((x) => x.id === recipient)!.unsubscribedFromMarketing = true;
  const sent = run("executeCampaign", c.id);
  assert.equal(sent.ok, true);
  assert.equal(
    db.campaigns
      .find((x) => x.id === c.id)!
      .deliveries!.find((x) => x.contactId === recipient)!.status,
    "excluded",
  );
  assert.equal(run("executeCampaign", c.id).data.sent, sent.data.sent);
  assert.equal(execute(db, "U002", "createCampaign", [c]).result.ok, false);
});
test("expired market source cannot produce campaign", () => {
  const db = freshDatabase();
  const a = db.marketAlerts[0];
  db.marketCalendar.find((x) => x.id === a.sourceCalendarId)!.status =
    "expired";
  assert.equal(
    execute(db, "U001", "approveMarketAlert", [a.id]).result.ok,
    false,
  );
});
