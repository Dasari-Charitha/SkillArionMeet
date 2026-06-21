function validateTemplateDefinition(template, expectedName, expectedLanguage) {
  if (!template) {
    throw new Error(`WhatsApp template "${expectedName}" was not found.`);
  }
  if (template.name !== expectedName) {
    throw new Error(`WhatsApp template name does not match "${expectedName}".`);
  }
  if (template.status !== "APPROVED") {
    throw new Error(`WhatsApp template "${expectedName}" is not Active.`);
  }
  if (template.language !== expectedLanguage) {
    throw new Error(`WhatsApp template language must be ${expectedLanguage}.`);
  }

  const body = (template.components || []).find(component => component.type === "BODY");
  const parameterIndexes = uniqueParameterIndexes(body?.text || "");
  const expectedIndexes = expectedName === "hello_world" ? [] : [1, 2];
  if (!sameNumbers(parameterIndexes, expectedIndexes)) {
    const expected = expectedIndexes.length ? expectedIndexes.length : "no";
    throw new Error(
      `WhatsApp template "${expectedName}" must contain ${expected} body parameters. `
      + `Create it with {{1}} for candidate name and {{2}} for the message and meeting link.`
    );
  }

  return { name: template.name, language: template.language, parameterIndexes };
}

function buildTemplateComponents(definition, recipientName, message) {
  if (!definition.parameterIndexes.length) {
    return undefined;
  }
  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: recipientName || "Candidate" },
        { type: "text", text: message },
      ],
    },
  ];
}

function uniqueParameterIndexes(text) {
  const indexes = Array.from(String(text || "").matchAll(/\{\{(\d+)\}\}/g), match => Number(match[1]));
  return Array.from(new Set(indexes)).sort((first, second) => first - second);
}

function sameNumbers(first, second) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

module.exports = {
  buildTemplateComponents,
  uniqueParameterIndexes,
  validateTemplateDefinition,
};
