const { base, inherit }  = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function AddFeatureTableTask(options={}) {
  base(this, options);
}

inherit(AddFeatureTableTask, EditingTask);

const proto = AddFeatureTableTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const session = context.session;
  const originalLayer = inputs.layer;
  const layerId = originalLayer.getId();
  const editingLayer = originalLayer.getEditingLayer();
  const feature = inputs.features.length ? inputs.features[inputs.features.length -1] : originalLayer.createNewFeature();
  feature.setTemporaryId();
  editingLayer.getEditingSource().addFeature(feature);
  session.pushAdd(layerId, feature);
  inputs.features.push(feature);
  d.resolve(inputs, context);
  return d.promise();
};

proto.stop = function() {};


module.exports = AddFeatureTableTask;
