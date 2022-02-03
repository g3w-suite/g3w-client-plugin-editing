const {base, inherit}= g3wsdk.core.utils;
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;
const EditingTask = require('./editingtask');

function PickFeatureTask(options={}) {
  this._options = {
    highlight: options.highlight || false,
    multi: options.multi || false
  };
  this.pickFeatureInteraction = null;
  this._busy = false;
  this._tools = options.tools || [];
  base(this, options);
}

inherit(PickFeatureTask, EditingTask);

const proto = PickFeatureTask.prototype;

proto.featureCanPicked = function(feature){
  return feature.get('shape') === null || feature.get('shape') === undefined;
};

proto.run = function(inputs, context, queques) {
  const d = $.Deferred();
  const editingLayer = inputs.layer.getEditingLayer();
  const layers = [editingLayer];
  let originalStyle;
  const features = inputs.features.filter(feature => this.featureCanPicked(feature));
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers,
    features
  });
  this.addInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction.on('picked', e => {
    const feature = e.feature;
    if (this.featureCanPicked(feature)){
      originalStyle = this.setFeaturesSelectedStyle([feature]);
      inputs.features.length === 0 && inputs.features.push(feature);
      queques.micro.addTask(() => inputs.features.forEach((feature => feature.setStyle(originalStyle))));
      this._steps && this.setUserMessageStepDone('select');
      d.resolve(inputs);
    } else d.reject();
  });

  return d.promise()
};

proto.stop = function() {
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};


module.exports = PickFeatureTask;
