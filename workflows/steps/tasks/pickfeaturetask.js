const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;
const EditingTask = require('./editingtask');

function PickFeatureTask(options={}) {
  this._options = {
    highlight: options.highlight || false,
    multi: options.multi || false
  }
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
  const features = inputs.features.length ? inputs.features : null;
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers,
    features
  });
  this.addInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction.on('picked', (e) => {
    const feature = e.feature;
    if (!features) inputs.features.push(feature);
    if (this._steps) {
      const originalStyle = this.setFeaturesSelectedStyle([feature]);
      this.setUserMessageStepDone('select');
      queques.micro.addTask(() => {
        feature.setStyle(originalStyle);
      })
      d.resolve(inputs)
    } else d.resolve(inputs);
  });
  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  //console.log('Stop pick feature');
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};


module.exports = PickFeatureTask;
