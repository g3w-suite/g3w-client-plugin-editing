const { base, inherit }  = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function AddPartToMuligeometriesTask(options={}) {
  base(this, options);
}

inherit(AddPartToMuligeometriesTask, EditingTask);

const proto = AddPartToMuligeometriesTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const { layer, features } = inputs;
  const layerId = layer.getId();
  const session = context.session;
  const feature = features[0];
  const featureGeometry = feature.getGeometry();
  const originalFeature = feature.clone();
  featureGeometry.setCoordinates([...featureGeometry.getCoordinates(), ...features[1].getGeometry().getCoordinates()]);
  session.pushUpdate(layerId, feature, originalFeature);
  inputs.features = [feature];
  d.resolve(inputs);
  return d.promise();
};

proto.stop = function() {
};


module.exports = AddPartToMuligeometriesTask;
