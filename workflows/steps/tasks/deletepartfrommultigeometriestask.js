const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;
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
  const layers = [editingLayer];
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers
  });
  this.addInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction.on('picked', evt => {
    const {feature, coordinate} = evt;
    if (feature){
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
        this.forEachFeatureAtPixel(pixel, (_feature)=>{
          if(!found) {
            source.removeFeature(_feature);
            if (source.getFeatures().length) {
              const newGeometry = singleGeometriesToMultiGeometry(source.getFeatures().map(feature => feature.getGeometry()));
              feature.setGeometry(newGeometry);
              session.pushUpdate(layerId, feature, originalFeature);
            } else {
              editingLayer.getSource().removeFeature(feature);
              session.pushDelete(layerId, feature)
            }
            d.resolve(inputs);
            found = true;
          }
        }, {
          layerFilter(layer){
            return layer === tempLayer
          },
          hitTolerance: 1
        });
        this.removeLayer(tempLayer);
        tempLayer = null;
      })
    } else d.resolve(inputs);
  });
  return d.promise()
};

proto.stop = function() {
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
};


module.exports = DeletePartToMuligeometriesTask;
