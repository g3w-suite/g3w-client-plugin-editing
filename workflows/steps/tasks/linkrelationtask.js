var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTask = require('./editingtask');
var GUI = g3wsdk.gui.GUI;
var PickFeatureInteraction = g3wsdk.ol3.interactions.PickFeatureInteraction;


// classe  per l'aggiungere una relazione
function LinkRelationTask(options) {
  options = options || {};
  base(this, options);
}

inherit(LinkRelationTask, EditingTask);

var proto = LinkRelationTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  var context = context;
  var d = $.Deferred();
  var previousPercContent;
  console.log('Add relation task run.......');
  if (context.isChild)
    previousPercContent = GUI.hideContent(true);
  GUI.setModal(false);
  var session = context.session;
  var childField = context.childField;
  //var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.edit : null;
  // vado a settare i layers su cui faccio l'interacion agisce
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
    inputs.features.push(originalFeature);
    inputs.features.push(feature);
    GUI.setModal(true);
    if (previousPercContent)
      GUI.hideContent(false, previousPercContent);
    d.resolve(inputs);
  });
  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('stop add relation task');
  GUI.setModal(true);
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};


module.exports = LinkRelationTask;