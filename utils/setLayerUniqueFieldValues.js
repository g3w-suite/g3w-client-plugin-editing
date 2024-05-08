const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

/**
 * @param { string } layerId
 *
 * @returns { Promise<*> }
 */
export async function setLayerUniqueFieldValues(layerId) {
  const service = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing'); //get editing service

  const promises = [];
  const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
  layer
    .getEditingFields()
    .forEach(field => {
      // skip when ..
      if (!(
        field.validate.unique &&
        undefined === (service.state.uniqueFieldsValues[layerId] ? service.state.uniqueFieldsValues[layerId][field.name] : []))
      ) {
        return;
      }
      promises.push(
        layer
          .getFilterData({ unique: field.name })
          .then((values = []) => {
            if (undefined === service.state.uniqueFieldsValues[layerId]) {
              service.state.uniqueFieldsValues[layerId] = {};
            }
            service.state.uniqueFieldsValues[layerId][field.name] = new Set(values);
          })
      );
    });
  await Promise.allSettled(promises);

  return service.state.uniqueFieldsValues[layerId];
}