const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;
const EditingTask = require('./editingtask');

function PickFeatureTask(options={}) {
  this.pickFeatureInteraction = null;
  this._busy = false;
  this._tools = options.tools || [];
  base(this, options);
}

inherit(PickFeatureTask, EditingTask);

var proto = PickFeatureTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  //console.log('Pick Feature Task run ....');
  const d = $.Deferred();
  //var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.edit : null;
  // vado a settare i layers su cui faccio l'interacion agisce
  const layers = [inputs.layer];
  const features = inputs.features.length ? inputs.features : null;
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers,
    features
  });
  // aggiungo
  this.addInteraction(this.pickFeatureInteraction);
  // gestisco l'evento
  this.pickFeatureInteraction.on('picked', function(e) {
    const feature = e.feature;
    if (!features)
      inputs.features.push(feature);
    d.resolve(inputs);
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
