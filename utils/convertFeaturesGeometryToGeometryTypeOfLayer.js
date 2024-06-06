/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @param features
 * @param geometryType
 *
 * @returns { Array } converted features
 */
export function convertFeaturesGeometryToGeometryTypeOfLayer({
 features = [],
 geometryType,
}) {
 const converted = [];
 const is3DGeometry = g3wsdk.core.geoutils.Geometry.is3DGeometry(geometryType);
 console.log(is3DGeometry)

 features.forEach(f => {
   const type = f.getGeometry() && f.getGeometry().getType();
   //in the case of geometry type and layer is not 3dGeometry, remove eventually 3d coordinate
   if (type && !is3DGeometry) {
    g3wsdk.core.geoutils.Geometry.removeZValueToOLFeatureGeometry({ feature: f });
   }
   //in the case of geometry type and layer is not 3dGeometry, add 3d coordinate
   if (type && is3DGeometry) {
     g3wsdk.core.geoutils.Geometry.addZValueToOLFeatureGeometry({ feature: f, geometryType });
   }
   if (geometryType === type) { converted.push(f) }
   else if (
    g3wsdk.core.geoutils.isSameBaseGeometryType(type, geometryType) &&
     (g3wsdk.core.geometry.Geometry.isMultiGeometry(geometryType) || !g3wsdk.core.geometry.Geometry.isMultiGeometry(type))
   ) {
     const cloned = f.clone();
     cloned.__layerId = f.__layerId;
     cloned.setGeometry(g3wsdk.core.geoutils.convertSingleMultiGeometry(f.getGeometry(), geometryType));
     converted.push(cloned);
   }
 });
 return converted;
}