// Read-only startup check: compares each model's schema-declared indexes
// against what actually exists in MongoDB and logs a warning for anything
// missing (e.g. a collection created before an index was added to its
// schema). Never creates or drops anything — run `node fixIndexes.js` to fix
// what this reports.
async function logMissingIndexes(models) {
  let missingCount = 0;
  for (const Model of models) {
    try {
      const declared = Model.schema.indexes(); // [[keyPattern, options], ...]
      if (!declared.length) continue;
      const existing = await Model.listIndexes();
      const existingKeys = new Set(existing.map((i) => JSON.stringify(i.key)));
      for (const [keys] of declared) {
        if (!existingKeys.has(JSON.stringify(keys))) {
          missingCount++;
          console.warn(`[index-check] ${Model.modelName}: missing index for ${JSON.stringify(keys)} — run "node fixIndexes.js"`);
        }
      }
    } catch (err) {
      console.warn(`[index-check] ${Model.modelName}: could not verify indexes — ${err.message}`);
    }
  }
  if (!missingCount) console.log('[index-check] all schema-declared indexes are present.');
  return missingCount;
}

module.exports = { logMissingIndexes };
