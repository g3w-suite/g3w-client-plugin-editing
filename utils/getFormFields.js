import WorkflowsStack from '../g3wsdk/workflow/stack'

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * Return in case of relation child workflow the layerId root
 * 
 * @returns {*}
 */
function getRootWorkflowLayerId() {
  return WorkflowsStack.getFirst().getInputs().layer.getId()
 };

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * Get form fields
 *
 * @param form.inputs.layer
 * @param form.inputs.features
 * @param form.context.excludeFields
 * @param form.context.get_default_value
 * @param form.isChild                   - whether is child form (ie. belongs to relation)
 */
export async function getFormFields({
  inputs,
  context,
  feature,
  isChild = false,
} = {}) {

  let has_unique        = false;                            // check for unique validation

  const service         = require('../services/editingservice');
  const relationLayerId = getRootWorkflowLayerId();         // root layerId (in case of edit relation)
  const layerId         = inputs.layer.getId();             // current form layerId
  const unique_values   = [];                               // unique values by feature field

  const fields          = inputs.layer.getFieldsWithValues( // editing fields with values (in case of update)
    feature,
    {
      exclude:           context.excludeFields,
      get_default_value: undefined !== context.get_default_value ? context.get_default_value : false,
    }
  );

  fields.forEach(field => {
    if (field.validate.unique && field.editable) {
      has_unique = true;
      unique_values.push({
        field,                           // feature field
        _value: feature.get(field.name), // feature field value (current in editing)
      })
    }
  });

  unique_values.forEach(({ _value, field }) => {
    const current_values = isChild                                                  // current editing feature add to
      ? service.getChildLayerUniqueFieldValues({ layerId, relationLayerId, field }) // child form --> belongs to relation
      : service.getLayerUniqueFieldValues({ layerId, field });                      // root layer --> TODO: CHECK IF FIELD IS RELATED TO 1:1 RELATION

    // convert "current" values to string (when not null or undefined)
    current_values.forEach(value => { field.validate.exclude_values.add([null, undefined].indexOf(value) === -1 ? `${value}` : value ); });

    // convert "inputs" values to string (when not null or undefined)
    inputs.features.forEach(feature => {
      const value = feature.get(field.name);
      if ([null, undefined].indexOf(value) === -1) {
        field.validate.exclude_values.add(`${value}`);
      }
    });

    // remove current value from exclude_values
    field.validate.exclude_values.delete(_value);
  });

  // skip when ..
  if (!has_unique) {
    return fields;
  }

  // Listen event method after close/save form
  const savedfeatureFnc = () => {
    unique_values.forEach(({ _value, field }) => {
      // skip when ...
      if (_value === field.value) {
        return;
      }
      if (isChild) {
        // relation form
        service.changeRelationLayerUniqueFieldValues({
          layerId,
          relationLayerId,
          field,
          oldValue: _value,
          newValueconvertSingleMultiGeometry: field.value
        });
      } else {
        // root form layer
        service
          .changeLayerUniqueFieldValues({
            layerId,
            field,
            oldValue: _value,
            newValue: field.value
          });
      }

    });

    if (false === isChild) {
      service.saveTemporaryRelationsUniqueFieldsValues(layerId);
    }

    return { once: true };
  };

  service.subscribe(`savedfeature_${layerId}`, savedfeatureFnc);
  service.subscribe(`closeform_${layerId}`, () => {
    service.unsubscribe(`savedfeature_${layerId}`, savedfeatureFnc);
    service.clearTemporaryRelationsUniqueFieldsValues(layerId);
    return { once: true };
  });

  return fields;
};