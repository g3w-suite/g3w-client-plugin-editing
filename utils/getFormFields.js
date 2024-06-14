import { Workflow } from '../g3wsdk/workflow/workflow';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * Get form fields
 *
 * @param form.inputs.layer
 * @param form.inputs.features
 * @param form.context.excludeFields
 * @param form.context.get_default_value
 * @param form.isChild                   - whether is child form (ie. belongs to relation)
 * @param form.multi                     - in case of multi editing set all fields to null
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function getFormFields({
  inputs,
  context,
  feature,
  isChild = false,
  multi,
} = {}) {

  let has_unique        = false;                                               // check for unique validation

  const service         = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
  const relationLayerId = Workflow.Stack.getFirst().getInputs().layer.getId(); // root layerId (in case of child edit relation)
  const layerId         = inputs.layer.getId();                                // current form layerId
  const unique_values   = [];                                                  // unique values by feature field

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
    let current_values; // current editing feature add to

    const relations = isChild && (
      service.state.uniqueFieldsValues[relationLayerId] &&
      service.state.uniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations
    );
    const has_values = relations && (
      undefined !== relations &&
      undefined !== relations[layerId] &&
      undefined !== relations[layerId][field.name]
    );

    // child form --> belongs to relation (get child layer unique field values)
    if (isChild && has_values) {
      current_values = relations[layerId][field.name];
    }

    // root layer --> TODO: CHECK IF FIELD IS RELATED TO 1:1 RELATION
    if (!isChild || !has_values) {
      current_values = service.state.uniqueFieldsValues[layerId] ? service.state.uniqueFieldsValues[layerId][field.name] : []
    }

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
    return _handleMulti(fields, multi);
  }

  // Listen event method after close/save form
  const savedfeatureFnc = () => {
    unique_values.forEach(({ _value, field }) => {
      // skip when ...
      if (_value === field.value) {
        return;
      }
      const layer = isChild && service.state.uniqueFieldsValues[relationLayerId];

      // relation form
      if (layer) {
        // change relation layer unique field values
        layer.__uniqueFieldsValuesRelations          = layer.__uniqueFieldsValuesRelations          || {};
        layer.__uniqueFieldsValuesRelations[layerId] = layer.__uniqueFieldsValuesRelations[layerId] || {};
        const values = new Set(service.state.uniqueFieldsValues[layerId][field.name]);
        values.delete(_value);
        values.add(field.value);
        layer.__uniqueFieldsValuesRelations[layerId][field.name] = values;
      }

      // root layer form 
      if (!layer && service.state.uniqueFieldsValues[layerId] && undefined !== service.state.uniqueFieldsValues[layerId][field.name]) {
        // change layer unique field values
        const values = service.state.uniqueFieldsValues[layerId][field.name];
        values.delete(_value);
        values.add(field.value);
      }

    });

    // Save temporary relation feature changes on father (root) layer feature 
    const relations = false === isChild && (
      service.state.uniqueFieldsValues[layerId] &&
      service.state.uniqueFieldsValues[layerId].__uniqueFieldsValuesRelations
    );

    // skip when no relation unique fields values are stored
    if (relations && undefined !== relations) {
      Object
        .keys(relations)
        .forEach(relationLayerId => {
          Object
            .entries(relations[relationLayerId])
            .forEach(([fieldName, uniqueValues]) => {
              service.state.uniqueFieldsValues[relationLayerId][fieldName] = uniqueValues;
            })
        });
      // clear temporary relations unique fields values
      if (service.state.uniqueFieldsValues[layerId]) {
        delete service.state.uniqueFieldsValues[layerId].__uniqueFieldsValuesRelations;
      }
    }

    return { once: true };
  };

  service.subscribe(`savedfeature_${layerId}`, savedfeatureFnc);
  service.subscribe(`closeform_${layerId}`, () => {
    service.unsubscribe(`savedfeature_${layerId}`, savedfeatureFnc);
    // clear temporary relations unique fields values
    if (service.state.uniqueFieldsValues[layerId]) {
      delete service.state.uniqueFieldsValues[layerId].__uniqueFieldsValuesRelations;
    }
    return { once: true };
  });

  return _handleMulti(fields, multi);
};

function _handleMulti(fields, multi) {
  if (multi) {
    fields = fields.map(field => {
        const f = JSON.parse(JSON.stringify(field));
        f.value = null;
        f.forceNull = true;
        f.validate.required = false;
        return f;
      })
      .filter(field => !field.pk)
  }
  return fields;
}
