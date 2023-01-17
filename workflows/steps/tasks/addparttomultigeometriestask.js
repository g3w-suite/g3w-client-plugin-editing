const { base, inherit }  = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function AddPartToMuligeometriesTask(options={}) {
  base(this, options);
}

inherit(AddPartToMuligeometriesTask, EditingTask);

const proto = AddPartToMuligeometriesTask.prototype;

proto.run = function(inputs, context) {
  return new Promise((resolve, reject) => {
    const { layer, features } = inputs;
    const layerId = layer.getId();
    const session = context.session;
    const feature = features[0];
    const featureGeometry = feature.getGeometry();
    const originalFeature = feature.clone();
    featureGeometry.setCoordinates([...featureGeometry.getCoordinates(), ...features[1].getGeometry().getCoordinates()]);
    /**
     * evaluated geometry expression
     */
    this.evaluateGeometryExpressionField({
      inputs,
      context,
      feature
    }).finally(()=>{
      session.pushUpdate(layerId, feature, originalFeature);
      inputs.features = [feature];
      resolve(inputs);
    });
  });
};

proto.stop = function() {};


module.exports = AddPartToMuligeometriesTask;
