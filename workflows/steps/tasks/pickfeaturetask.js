const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
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

proto.run = function(inputs, context, queques) {
  const d = $.Deferred();
  const editingLayer = inputs.layer.getEditingLayer();
  const layers = [editingLayer];
  let originalStyle;
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers,
    features: inputs.features
  });
  this.addInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction.on('picked', (e) => {
    const feature = e.feature;
    originalStyle = this.setFeaturesSelectedStyle([feature]);
    inputs.features.length === 0 && inputs.features.push(feature);
    queques.micro.addTask(()=>{
      inputs.features.forEach((feature => feature.setStyle(originalStyle)));
    })
    this._steps && this.setUserMessageStepDone('select');
    d.resolve(inputs);
  });

  return d.promise()
};

proto.stop = function() {
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};


module.exports = PickFeatureTask;
