/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function getEditingLayerById(layerId){
  return g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getLayerById(layerId);
}