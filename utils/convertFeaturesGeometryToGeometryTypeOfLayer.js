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
 features.forEach(f => {
   const type = f.getGeometry() && f.getGeometry().getType();
   if (geometryType === type) {
     converted.push(f);
   } else if (
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
};