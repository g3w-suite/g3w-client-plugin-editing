var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTask = require('./editingtask');

function AddFeatureTableTask(options) {
  options = options || {};
  base(this, options);
}

inherit(AddFeatureTableTask, EditingTask);

var proto = AddFeatureTableTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  var d = $.Deferred();
  var originalLayer = context.layer;
  var layerId = originalLayer.getId();
  // l'etiing layer in realtà è la session per i layer tabellari
  var editingLayer = inputs.layer;
  var session = context.session;
  // nella creazione della nuova feature utilizzo l'editing layer originale (TableLayer)
  var feature = originalLayer.createNewFeature();
  session.pushAdd(layerId, feature);
  editingLayer.getSource().addFeature(feature);
  inputs.features.push(feature);
  d.resolve(inputs);
  return d.promise();
};


module.exports = AddFeatureTableTask;
