const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildTemplateComponents,
  uniqueParameterIndexes,
  validateTemplateDefinition,
} = require("../whatsapp-template");

test("extracts unique ordered template parameter indexes", () => {
  assert.deepEqual(uniqueParameterIndexes("Hello {{2}} {{1}} {{2}}"), [1, 2]);
});

test("accepts the built-in zero-parameter template", () => {
  const definition = validateTemplateDefinition({
    name: "hello_world",
    status: "APPROVED",
    language: "en_US",
    components: [{ type: "BODY", text: "Hello World" }],
  }, "hello_world", "en_US");
  assert.deepEqual(definition.parameterIndexes, []);
  assert.equal(buildTemplateComponents(definition, "Charitha", "Meeting update"), undefined);
});

test("accepts a candidate template with exactly two body parameters", () => {
  const definition = validateTemplateDefinition({
    name: "candidate_meeting_message",
    status: "APPROVED",
    language: "en_US",
    components: [{ type: "BODY", text: "Hello {{1}}\n\n{{2}}" }],
  }, "candidate_meeting_message", "en_US");
  const components = buildTemplateComponents(definition, "Charitha", "Join: https://example.com");
  assert.equal(components[0].parameters.length, 2);
  assert.equal(components[0].parameters[1].text, "Join: https://example.com");
});

test("rejects static custom templates before sending", () => {
  assert.throws(() => validateTemplateDefinition({
    name: "candidate_meeting_update",
    status: "APPROVED",
    language: "en_US",
    components: [{ type: "BODY", text: "Hello Charitha" }],
  }, "candidate_meeting_update", "en_US"), /must contain 2 body parameters/);
});

test("rejects templates that are not active", () => {
  assert.throws(() => validateTemplateDefinition({
    name: "candidate_meeting_message",
    status: "PENDING",
    language: "en_US",
    components: [{ type: "BODY", text: "Hello {{1}} {{2}}" }],
  }, "candidate_meeting_message", "en_US"), /not Active/);
});
