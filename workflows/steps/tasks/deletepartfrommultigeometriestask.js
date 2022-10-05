const { base, inherit }  = g3wsdk.core.utils;
const { multiGeometryToSingleGeometries, singleGeometriesToMultiGeometry } = g3wsdk.core.geoutils;
const EditingTask = require('./editingtask');

function DeletePartToMuligeometriesTask(options={}) {
  this.pickFeatureInteraction = null;
  base(this, options);
}

inherit(DeletePartToMuligeometriesTask, EditingTask);

const proto = DeletePartToMuligeometriesTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originaLayer = inputs.layer;
  const editingLayer = inputs.layer.getEditingLayer();
  const layerId = originaLayer.getId();
  const session = context.session;
  const {features, coordinate} = inputs;
  const feature = features[0];
  const originalFeature = feature.clone();
  const geometry = feature.getGeometry();
  const geometries = multiGeometryToSingleGeometries(geometry);
  const source = new ol.source.Vector({
    features: geometries.map(geometry => new ol.Feature(geometry))
  });
  const map = this.getMap();
  const pixel = map.getPixelFromCoordinate(coordinate);
  let tempLayer = new ol.layer.Vector({
    source,
    style: editingLayer.getStyle()
  });
  map.addLayer(tempLayer);
  map.once('postrender', function(){
    let found = false;
    this.forEachFeatureAtPixel(pixel, _feature => {
        if(!found) {
          source.removeFeature(_feature);
          if (source.getFeatures().length) {
            const newGeometry = singleGeometriesToMultiGeometry(source.getFeatures().map(feature => feature.getGeometry()));
            feature.setGeometry(newGeometry);
            /**
             * evaluated geometry expression
             */
            this.evaluateGeometryExpressionField({
              inputs,
              feature
            });
            /**
             * end of evaluated
             */
            session.pushUpdate(layerId, feature, originalFeature);
          } else {
            editingLayer.getSource().removeFeature(feature);
            session.pushDelete(layerId, feature)
          }
          d.resolve(inputs);
          found = true;
        }
      },
      {
        layerFilter(layer){
          return layer === tempLayer
        },
        hitTolerance: 1
      }
    );
    this.removeLayer(tempLayer);
    tempLayer = null;
  });
  return d.promise()
};

proto.stop = function() {
};


module.exports = DeletePartToMuligeometriesTask;
