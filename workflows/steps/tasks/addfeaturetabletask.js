const { base, inherit }  = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function AddFeatureTableTask(options={}) {
  base(this, options);
}

inherit(AddFeatureTableTask, EditingTask);

const proto = AddFeatureTableTask.prototype;

/**
 * @param { Object } inputs
 * @param inputs.layer
 * @param inputs.features
 * @param { Object } context
 * @param context.session
 * 
 * @returns jQuery promise 
 */
proto.run = function(inputs, context) {
  const d = $.Deferred();

  const feature = inputs.features.length > 0 ? inputs.features[inputs.features.length -1 ] : inputs.layer.createNewFeature();

  feature.setTemporaryId();

  inputs.layer.getEditingLayer().getEditingSource().addFeature(feature);

  context.session.pushAdd(inputs.layer.getId(), feature, false);

  inputs.features.push(feature);

  this.setContextGetDefaultValue(true);

  d.resolve(inputs, context);

  return d.promise();
};

proto.stop = function() {};


module.exports = AddFeatureTableTask;
