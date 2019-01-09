const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function AddFeatureTableTask(options) {
  options = options || {};
  base(this, options);
}

inherit(AddFeatureTableTask, EditingTask);

const proto = AddFeatureTableTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = context.layer;
  // l'etiing layer in realtà è la session per i layer tabellari
  const editingLayer = inputs.layer;
  // nella creazione della nuova feature utilizzo l'editing layer originale (TableLayer)
  const feature = originalLayer.createNewFeature();
  editingLayer.getSource().addFeature(feature);
  inputs.features.push(feature);
  d.resolve(inputs);
  return d.promise();
};

proto.stop = function() {};


module.exports = AddFeatureTableTask;
