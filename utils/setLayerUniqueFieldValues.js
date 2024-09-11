const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * Method to get unique values of unique input values from server
 * It's called
 * - When toolbox start
 * - Open a relation from OpenFormStep
 * 
 * @param { string } layerId
 *
 * @returns { Promise<*> }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function setLayerUniqueFieldValues(layerId) {
  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing'); //get editing service

  const promises = [];
  const layer    = CatalogLayersStoresRegistry.getLayerById(layerId);
  layer
    .getEditingFields()
    //filter field that is unique and not yet set unique values
    .filter(field => field.validate.unique && undefined === (service.state.uniqueFieldsValues[layerId] && service.state.uniqueFieldsValues[layerId][field.name]))
    .forEach((field => {
      promises.push(new Promise((resolve, reject) => {
        layer
          .getFilterData({ unique: field.name })
          .then((values = []) => {
            //check if not yet create
            if (undefined === service.state.uniqueFieldsValues[layerId]) {
              service.state.uniqueFieldsValues[layerId] = {};
            }
            //set unique values for the field
            service.state.uniqueFieldsValues[layerId][field.name] = new Set(values);
            resolve();
          })
          .fail(e => { console.warn(e); reject(e); })
      }))
    }))
  await Promise.allSettled(promises);
  return service.state.uniqueFieldsValues[layerId];
}