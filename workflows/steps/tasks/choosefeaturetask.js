const { base, inherit } =  g3wsdk.core.utils;
const EditingTask = require('./editingtask');
const ChooseFeatureToEditComponent = require('../../../g3w-editing-components/choosefeaturetoedit');

function CopyFeaturesFromOtherLayerTask(options={}) {
  base(this, options);
}

inherit(CopyFeaturesFromOtherLayerTask, EditingTask);

const proto = CopyFeaturesFromOtherLayerTask.prototype;

proto.run = function(inputs) {
  const d = $.Deferred();
  const features = inputs.features;
  if (features.length === 1) d.resolve(inputs);
  else {
    this.chooseFeatureFromFeatures({
      promise:d,
      features
    }).then((feature) => {
      inputs.features = [feature];
      d.resolve(inputs)
    }).catch(()=>{
      d.reject();
    })
  }
  return d.promise();
};

proto.stop = function() {
  return true;
};

module.exports = CopyFeaturesFromOtherLayerTask;
