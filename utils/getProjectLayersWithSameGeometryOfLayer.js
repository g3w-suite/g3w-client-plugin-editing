const { Geometry }                    = g3wsdk.core.geometry;
const { isSameBaseGeometryType }      = g3wsdk.core.geoutils;
const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

/**
 * @param layer
 * @param { Object } options
 * @param { Array }  options.exclude
 *
 * @returns {*}
 */
export function getProjectLayersWithSameGeometryOfLayer(layer, options = { exclude: [] }) {
  const { exclude = [] } = options;
  const geometryType = layer.getGeometryType();
  return CatalogLayersStoresRegistry
    .getLayers()
    .filter(layer => {
      return (
        layer.isGeoLayer() &&
        layer.getGeometryType &&
        layer.getGeometryType() &&
        -1 === exclude.indexOf(layer.getId())
      ) && (
        layer.getGeometryType() === geometryType ||
        (
          isSameBaseGeometryType(layer.getGeometryType(), geometryType) &&
          Geometry.isMultiGeometry(geometryType)
        )
      )
    });
}