var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var noop = g3wsdk.core.utils.noop;
var PickFeatureInteraction = g3wsdk.ol3.interactions.PickFeatureInteraction;

var EditingTask = require('./editingtask');

function PickFeatureTask(options) {
  var self = this;
  this.isPausable = true;
  this.pickFeatureInteraction = null;
  this._running = false;
  this._busy = false;
  this._originalFeatureStyle = null;
  base(this, options);
}

inherit(PickFeatureTask, EditingTask);

var proto = PickFeatureTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  console.log('Pick Feature Task run ....');
  var self = this;
  var d = $.Deferred();
  //var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.edit : null;
  // vado a settare i layers su cui faccio l'interacion agisce
  var layers = [inputs.layer];
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers: layers
  });
  // aggiungo
  this.addInteraction(this.pickFeatureInteraction);
  // gestisco l'evento
  this.pickFeatureInteraction.on('picked', function(e) {
    var feature = e.feature;
    feature.update();
    inputs.features.push(feature);
    d.resolve(inputs);
  });
  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};


module.exports = PickFeatureTask;