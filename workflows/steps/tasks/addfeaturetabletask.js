const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function AddFeatureTableTask(options={}) {
  base(this, options);
}

inherit(AddFeatureTableTask, EditingTask);

const proto = AddFeatureTableTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  const d = $.Deferred();
  const session = context.session;
  const originalLayer = context.layer;
  const layerId = originalLayer.getId();
  // l'etiing layer in realtà è la session per i layer tabellari
  const editingLayer = inputs.layer;
  // nella creazione della nuova feature utilizzo l'editing layer originale (TableLayer)
  const feature = originalLayer.createNewFeature();
  originalLayer.isPkEditable() ?  feature.setNew() : feature.setTemporaryId();
  //setto il valore del padre sempre
  feature.set(context.childField, context.fatherValue);
  editingLayer.getSource().addFeature(feature);
  inputs.features.push(feature);
  session.pushAdd(layerId, feature);
  d.resolve(inputs, context);
  return d.promise();
};

proto.stop = function() {};


module.exports = AddFeatureTableTask;
