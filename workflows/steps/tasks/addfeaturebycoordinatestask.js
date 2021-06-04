const inherit = g3wsdk.core.utils.inherit;
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
  const source = editingLayer.getSource();
  const feature = new Feature({
    feature: e.feature,
  });
  feature.setTemporaryId();
  source.addFeature(feature);
  session.pushAdd(layerId, feature);
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
