const inherit = g3wsdk.core.utils.inherit;
const Layer = g3wsdk.core.layer.Layer;
const Geometry = g3wsdk.core.geometry.Geometry;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');
const Feature = g3wsdk.core.layer.features.Feature;

function AddFeatureByCoordinatesTask(options={}) {
  base(this, options);
}

inherit(AddFeatureByCoordinatesTask, EditingTask);

const proto = AddFeatureByCoordinatesTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const editingLayer = originalLayer.getEditingLayer();
  const session = context.session;
  const layerId = originalLayer.getId();
  let geometryType;
  if (originalLayer.getEditingGeometryType() === Geometry.GeometryTypes.LINE) geometryType = 'LineString';
  else if (originalLayer.getEditingGeometryType() === Geometry.GeometryTypes.MULTILINE) geometryType = 'MultiLineString';
  else geometryType = originalLayer.getEditingGeometryType();
  switch (geometryType) {
    case Geometry.GeometryTypes.POINT:
    case Geometry.GeometryTypes.MULTI_POINT:
      break;
  }
  const source = editingLayer.getSource();
  const feature = new Feature({
    feature: e.feature,
  });
  feature.setTemporaryId();
  source.addFeature(feature);
  const newFeature = session.pushAdd(layerId, feature);
  inputs.newFeature = newFeature;
  inputs.features.push(feature);
  d.resolve(inputs);
  return d.promise();
};

proto.stop = function() {
  if (this._snapInteraction) {
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this.drawInteraction);
  this.drawInteraction = null;
  return true;
};

proto._removeLastPoint = function() {
  if (this.drawInteraction) {
    try {
      this.drawInteraction.removeLastPoint();
    }
    catch (err) {
      console.log(err)
    }
  }
};

module.exports = AddFeatureByCoordinatesTask;
