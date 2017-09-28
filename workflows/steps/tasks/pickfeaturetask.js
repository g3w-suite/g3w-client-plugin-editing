var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var PickFeatureInteraction = g3wsdk.ol3.interactions.PickFeatureInteraction;
var EditingTask = require('./editingtask');
var GUI = g3wsdk.gui.GUI;

function PickFeatureTask(options) {
  this.pickFeatureInteraction = null;
  this._busy = false;
  base(this, options);
}

inherit(PickFeatureTask, EditingTask);

var proto = PickFeatureTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  console.log('Pick Feature Task run ....');
  var d = $.Deferred();
  //var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.edit : null;
  // vado a settare i layers su cui faccio l'interacion agisce
  var layers = [inputs.layer];
  var features = inputs.features.length ? inputs.features : null;
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers: layers,
    features: features
  });
  // aggiungo
  this.addInteraction(this.pickFeatureInteraction);
  // gestisco l'evento
  this.pickFeatureInteraction.on('picked', function(e) {
    var feature = e.feature;
    if (!features)
      inputs.features.push(feature);
    d.resolve(inputs);
  });
  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('Stop pick feature');
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};


module.exports = PickFeatureTask;