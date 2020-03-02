const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function AddFeatureTableTask(options) {
  options = options || {};
  base(this, options);
}

inherit(AddFeatureTableTask, EditingTask);

const proto = AddFeatureTableTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const session = context.session;
  const originalLayer = context.layer;
  const layerId = originalLayer.getId();
  const editingLayer = inputs.layer;
  const feature = originalLayer.createNewFeature();
  originalLayer.isPkEditable() ?  feature.setNew() : feature.setTemporaryId();
  editingLayer.getSource().addFeature(feature);
  const newFeature = session.pushAdd(layerId, feature);
  inputs.newFeature = newFeature;
  inputs.features.push(feature);
  d.resolve(inputs, context);
  return d.promise();
};

proto.stop = function() {};


module.exports = AddFeatureTableTask;
