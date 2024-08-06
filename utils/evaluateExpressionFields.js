import { getParentFormData } from './getParentFormData';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @param expression.inputs.layer
 * @param expression.context.excludeFields
 * @param expression.context.get_default_value
 * @param expression.feature
 *
 * @returns {Promise<void>}
 *
 * @since g3w-client-plugin-editing@v3.5.14
 */
export async function evaluateExpressionFields({
  inputs,
  context,
  feature,
} = {}) {
  const promises  = []; // promises from expression evaluation

  inputs.layer
    .getFieldsWithValues(
      feature,
      {
        exclude:           context.excludeFields,
        get_default_value: undefined !== context.get_default_value ? context.get_default_value : false,
      }
    )
    .forEach(field => {

      // default expression
      if (field.input.options.default_expression && (field.input.options.default_expression.apply_on_update || feature.isNew())) {
        promises.push(
          new Promise(async (resolve, reject) => {
            try {
              await g3wsdk.core.input.inputService.handleDefaultExpressionFormInput({
                field,
                feature,
                qgs_layer_id: inputs.layer.getId(),
                parentData:   getParentFormData(),
              });
              feature.set(field.name, field.value);
              resolve(feature)
            } catch(e) {
              console.warn(e);
              reject(e);
            }
          })
        );
      }

      // filter expression
      if (field.input.options.filter_expression) {
        promises.push(
          new Promise(async (resolve, reject) => {
            try {
              await g3wsdk.core.input.inputService.handleFilterExpressionFormInput({
                field,
                feature,
                qgs_layer_id: inputs.layer.getId(),
                parentData:   getParentFormData(),
              });
              feature.set(field.name, field.value);
              resolve(feature)
            } catch(e) {
              console.warn(e);
              reject(e);
            }
          })
        );
      }

    });

  await Promise.allSettled(promises);

  return feature;
}