const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');
const GUI = g3wsdk.gui.GUI;
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;


// classe  per l'aggiungere una relazione
function LinkRelationTask(options) {
  options = options || {};
  base(this, options);
}

inherit(LinkRelationTask, EditingTask);

const proto = LinkRelationTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  const d = $.Deferred();
  GUI.setModal(false);
  const originalLayer = context.layer;
  const layerType = originalLayer.getType();
  //var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.edit : null;
  // vado a settare i layers su cui faccio l'interacion agisce
  const editingLayer = inputs.layer;
  if (layerType == 'vector') {
    this.pickFeatureInteraction = new PickFeatureInteraction({
      layers: [editingLayer]
    });
    // aggiungo
    this.addInteraction(this.pickFeatureInteraction);
    // gestisco l'evento
    this.pickFeatureInteraction.on('picked', function(e) {
      const relation = e.feature;
      inputs.features.push(relation);
      GUI.setModal(true);
      d.resolve(inputs);
    });
  } else {

  }

  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  GUI.setModal(true);
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};


module.exports = LinkRelationTask;
