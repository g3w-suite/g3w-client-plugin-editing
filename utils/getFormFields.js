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
  feature, //current feature
  isChild = false, //true -> relation form
  multi, // true -> multi features (e.g edit multi features attributes form)
} = {}) {

  //editing service
  const service         = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
  // root layerId (in case of child edit relation)
  const relationLayerId = Workflow.Stack.getFirst().getInputs().layer.getId();
  // current form layerId// unique values by feature field
  const layerId         = inputs.layer.getId();

  const fields          = inputs.layer.getFieldsWithValues( // editing fields with values (in case of update)
    feature,
    {
      exclude:           context.excludeFields, // add exclude fields
      get_default_value: undefined === context.get_default_value ? false : context.get_default_value,
    }
  );

  //Loop through fields
  const unique_values = fields
    //check if field is a unique widget type
    .filter(f => f.validate.unique && f.editable)
    .map(field => ({
      field,                            // feature field
       _value: feature.get(field.name), // feature current field value
      }))

  //Loop through uniq value field
  unique_values.forEach(({ _value, field }) => {
    // current editing feature adds to
    let current_values;
    //get relations
    const relations = isChild && (
      service.state.uniqueFieldsValues[relationLayerId]
      && service.state.uniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations
      && service.state.uniqueFieldsValues[relationLayerId].__uniqueFieldsValuesRelations[layerId]
    );

    //check if relation field has values
    const has_values = relations && (undefined !== (relations[layerId] || {})[field.name]);

    // child form --> belongs to relation (get child layer unique field values)
    if (isChild && has_values) {
      current_values = relations[layerId][field.name];
    }

    // root layer --> get current values of unique field
    if (!isChild || !has_values) {
      current_values = (service.state.uniqueFieldsValues[layerId] || {})[field.name] || [];
      //check if temporary value is not added to values
      // @since 3.9.0
      if (!field.input.options.values.includes(field.value)) {
        field.input.options.values.push(field.value);
      }
    }

    // convert "current" values to string (when not null or undefined)
    current_values.forEach(v => field.validate.exclude_values.add(![null, undefined].includes(v)? `${v}` : v ) );

    // convert "inputs" values to string (when not null or undefined)
    inputs.features.forEach(f => {
      const value = f.get(field.name);
      if (![null, undefined].includes(value)) {
        field.validate.exclude_values.add(`${value}`);
      }
    });

    // remove current value from exclude_values
    field.validate.exclude_values.delete(_value);
  });

  // skip when no fields are unique in multi features change form attribute
  if (0 === unique_values.length) {
    return _handleMulti(fields, multi);
  }

  // Listen to event method after close/save form
  const savedfeatureFnc = () => {
    unique_values.forEach(({ _value, field }) => {
      // initial value is the same that current field vale (no changed)
      if (_value === field.value) { return }
      //get
      const layer = isChild && service.state.uniqueFieldsValues[relationLayerId];

      // relation form
      if (layer) {
        // change relation layer unique field values
        layer.__uniqueFieldsValuesRelations          = layer.__uniqueFieldsValuesRelations          || {};
        layer.__uniqueFieldsValuesRelations[layerId] = layer.__uniqueFieldsValuesRelations[layerId] || {};
        const values = new Set(layer.__uniqueFieldsValuesRelations[layerId][field.name]);
        values.delete(_value);
        values.add(field.value);
        layer.__uniqueFieldsValuesRelations[layerId][field.name] = values;
      }

      // root layer form (no relation)
      if (!layer && service.state.uniqueFieldsValues[layerId] && service.state.uniqueFieldsValues[layerId][field.name]) {
        // change layer unique field values
        const values = service.state.uniqueFieldsValues[layerId][field.name];
        values.delete(_value);
        values.add(field.value);
      }

    });

    // Save temporary relation feature changes on father (root) layer feature 
    const relations = false === isChild && (
      service.state.uniqueFieldsValues[layerId]
      && service.state.uniqueFieldsValues[layerId].__uniqueFieldsValuesRelations
    );

    // skip when no relation unique fields values is stored
    if (relations) {
      Object
        .keys(relations)
        .forEach(id => {
          Object
            .entries(relations[id])
            .forEach(([name, values]) => {
              service.state.uniqueFieldsValues[id][name] = values;
            })
        });
      // clear temporary relations unique fields values
      if (service.state.uniqueFieldsValues[layerId]) {
        delete service.state.uniqueFieldsValues[layerId].__uniqueFieldsValuesRelations;
      }
    }

    return { once: true };
  };

  //event when insert/edit form button is pressed
  service.subscribe(`savedfeature_${layerId}`, savedfeatureFnc);
  //event when close form layer
  service.subscribe(`closeform_${layerId}`, () => {
    //unsubscribe event
    service.unsubscribe(`savedfeature_${layerId}`, savedfeatureFnc);
    // clear temporary relations unique fields values
    if (service.state.uniqueFieldsValues[layerId] && service.state.uniqueFieldsValues[layerId].__uniqueFieldsValuesRelations) {
      delete service.state.uniqueFieldsValues[layerId].__uniqueFieldsValuesRelations;
    }
    return { once: true };
  });

  return _handleMulti(fields, multi);
}

function _handleMulti(fields, multi) {
  if (multi) {
    fields = fields.map(field => {
      const f             = JSON.parse(JSON.stringify(field));
      f.value             = null;
      f._value            = null; // @since v3.9.0 Fix update form field: Set the same value of value
      f.forceNull         = true;
      f.validate.required = false; //set false because all features have already required field filled
      return f;
    }).filter(f => !f.pk)
  }

  return fields;
}
