/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * @param layer,
 * @param feature
 *
 * @returns Array of fields
 */
export function getNotEditableFieldsNoPkValues({
  layer,
  feature,
}) {
  return layer
    .getEditingNotEditableFields()
    .reduce((fields, field) => {
      fields[field] = layer.isPkField(field) ? null : feature.get(field); // NB: Primary Key fields need to be `null`
      return fields;
    }, {});
}