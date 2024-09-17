/** Sort an array of strings (alphabetical order) */
const sortAlphabeticallyArray = (arr) => arr.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

/* Sort an array of numbers (natural order) */
const sortNumericArray = (arr, ascending = true) => arr.sort((a, b) => (ascending ? (a - b) : (b - a)));

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
  multi, // true -> multi features (e.g edit multi features attributes form)
} = {}) {

  //editing service
  const service         = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
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
    //check if field is a unique field. Exclude pk not edittable
    .filter(f => !(f.pk && false === f.editable) && ('unique' === f.input.type || f.validate.unique))
    .map(field => ({
      field,                            // feature field
       _value: feature.get(field.name), // feature current field value
      }))

  //Loop through unique fields
  unique_values.forEach(({ _value, field }) => {
    //get current stored unique values for field
    const current_values = service.state.uniqueFieldsValues[layerId][field.name] || new Set([]);
    //filter null value otherwise sort function gets an error
    const values = Array.from(current_values).filter(v => null !== v );
    //NEED TO ADD ALWAYS CURRENT VALUE
    field.input.options.values = (['integer', 'float', 'bigint'].includes(field.type) ? sortNumericArray: sortAlphabeticallyArray)(values);
    if (current_values.has(null)) {
      field.input.options.values.unshift(null);
    }

    // convert "current" values to string (when not null or undefined)
    current_values.forEach(v => field.validate.exclude_values.add(![null, undefined].includes(v)? `${v}` : v ) );

    // remove current value from exclude_values
    field.validate.exclude_values.delete(`${_value}`);
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
      //  layer form
      if (service.state.uniqueFieldsValues[layerId][field.name]) {
        // change layer unique field values
        const values = service.state.uniqueFieldsValues[layerId][field.name];
        //If changed, delete it from _value
        values.delete(_value);
        //aff new one to value list unique field
        values.add(field.value);
      }
    });

    return { once: true };
  };

  //event when insert/edit form button is pressed
  service.subscribe(`savedfeature_${layerId}`, savedfeatureFnc);
  //event when close form layer
  service.subscribe(`closeform_${layerId}`, () => {
    //unsubscribe event
    service.unsubscribe(`savedfeature_${layerId}`, savedfeatureFnc);
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
