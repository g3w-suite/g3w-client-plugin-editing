const { XHR }                         = g3wsdk.core.utils;
const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { Object } opts
 * @param { string } opts.layerId
 * @param opts.fid
 *
 * @returns {Promise<*>}
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function getProjectLayerFeatureById({
  layerId,
  fid,
}) {
  try {
    const response = await XHR.get({
      url:    CatalogLayersStoresRegistry.getLayerById(layerId).getUrl('data'),
      params: { fids: fid },
    });
    return (response.result && response.vector.data.features || []).at(0);
  } catch(e) {
    console.warn(e);
  }
}