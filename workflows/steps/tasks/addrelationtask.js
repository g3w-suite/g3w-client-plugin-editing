var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTask = require('./editingtask');
var GUI = g3wsdk.gui.GUI;
var PickFeatureInteraction = g3wsdk.ol3.interactions.PickFeatureInteraction;


// classe  per l'aggiungere una relazione
function AddRelationTask(options) {
  options = options || {};
  base(this, options);
}

inherit(AddRelationTask, EditingTask);

var proto = AddRelationTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  var context = context;
  var d = $.Deferred();
  console.log('Add relation task run.......');
  GUI.setModal(false);
  var session = context.session;
  var fatherField = context.fatherField;
  var childField = context.childField;
  //var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.edit : null;
  // vado a settare i layers su cui faccio l'interacion agisce
  var fatherFeature = inputs.features[0];
  var layers = [inputs.layer];
  var layerId = inputs.layer.get('id');
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers: layers
  });
  // aggiungo
  this.addInteraction(this.pickFeatureInteraction);
  // gestisco l'evento
  this.pickFeatureInteraction.on('picked', function(e) {
    var feature = e.feature;
    var originalFeature = feature.clone();
    originalFeature.update();
    feature.set(childField, fatherFeature.get(fatherField));
    feature.update();
    session.push({
      layerId: layerId,
      feature: feature
    }, {
      layerId: layerId,
      feature: originalFeature
    });
    d.resolve(feature);
  });
  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  GUI.setModal(true);
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};


module.exports = AddRelationTask;