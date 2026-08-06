const { body } = require('express-validator');

// Validates that <field> is a Mongo id that resolves to an active document in
// Model, and stashes the resolved document on req.resolvedRefs[resolvedKey]
// so the route handler can snapshot its display fields without a second query.
// Rejects unknown / inactive / malformed ids with the standard field-error format.
function resolveRef(field, Model, resolvedKey, { optional = false, activeFilter = {}, label } = {}) {
  const l = label || field;
  let chain = body(field);
  chain = optional
    ? chain.optional({ checkFalsy: true })
    : chain.exists({ checkFalsy: true }).withMessage(`${l} is required.`);
  return chain
    .isMongoId().withMessage(`${l} must be a valid id.`)
    .bail()
    .custom(async (value, { req }) => {
      const doc = await Model.findOne({ _id: value, ...activeFilter });
      if (!doc) throw new Error(`${l} does not match an active record.`);
      req.resolvedRefs = req.resolvedRefs || {};
      req.resolvedRefs[resolvedKey] = doc;
      return true;
    });
}

module.exports = { resolveRef };
