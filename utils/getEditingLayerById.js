export function getEditingLayerById(layerId){
  return g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getLayerById(layerId);
}