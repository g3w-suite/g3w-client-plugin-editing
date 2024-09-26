const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * Method to get unique values of unique input values from server
 * It's called
 * - When toolbox start (parent layer and relation)
 * - After commit to server (to get fresh new data)
 * 
 * @param { string } layerId
 *
 * @returns { Promise<*> }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function setLayerUniqueFieldValues(layerId) {
  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing'); //get editing service
  await new Promise((resolve, reject) => {
    const layer = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getLayerById(layerId);
    //get all values for unique field
    layer.getWidgetData({
      type: 'unique',
      fields: Object.values(layer
        .getEditingFields()
        //filter field that is unique and not yet set unique values
        .filter(f => !(f.pk && false === f.editable) && ('unique' === f.input.type || f.validate.unique)))
        .map(f => f.name).join()
    }).then((response) => {
        Object
          .entries(response.data || {})
          .forEach(([name, values]) => {
            service.state.uniqueFieldsValues[layerId][name] = new Set(values)
          })

        resolve(service.state.uniqueFieldsValues[layerId][name])
      })
      .fail(e => { console.warn(e); reject(e); })
  })
  return service.state.uniqueFieldsValues[layerId];
}