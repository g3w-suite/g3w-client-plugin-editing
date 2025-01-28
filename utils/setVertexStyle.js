const { Geometry } = g3wsdk.core.geoutils;
/**
 * @since 3.9.1
 * @param feature
 * @param lineColor,
 * @param vertexColor
 */
export function setVertexStyle({
  feature,
  vertexColor = 'red',
  lineColor   = 'yellow'
} = {}) {
  const geometryType = feature.getGeometry().getType();
  feature.setStyle(() => [
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: 5,
        fill:   null,
        stroke: new ol.style.Stroke({ color: vertexColor, width: 3 })
      }),
      geometry: f => new ol.geom.MultiPoint(
        ( // in the case of multipolygon geometry
          Geometry.isPolygonGeometryType(geometryType)
          && Geometry.isMultiGeometry(geometryType)
        ) ? f.getGeometry().getCoordinates()[0][0]
          : Geometry.isLineGeometryType(geometryType)
            ? f.getGeometry().getCoordinates()[0]
            : [f.getGeometry().getCoordinates()]
      )
    }),
    new ol.style.Style({ stroke: new ol.style.Stroke({ color: lineColor, width: 4 })})
  ]);
}