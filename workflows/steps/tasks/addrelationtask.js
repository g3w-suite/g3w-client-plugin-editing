var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTask = require('./editingtask');
var Feature = g3wsdk.core.layer.features.Feature;

// classe  per l'aggiungere una relazione
function AddRelationTask(options) {
  options = options || {};
  base(this, options);
}

inherit(AddRelationTask, EditingTask);

var proto = AddRelationTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  console.log('Add relation task run.......');
  var d = $.Deferred();
  this._layer = inputs.layer;
  //recupero la sessione dal context
  var session = context.session;
  // vado a rrecuperare la primary key del layer
  var originalLayer = session.getEditor().getLayer();
  return d.promise();
};


// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('stop add task ...');
  //rimuove e setta a null la _snapInteraction
  if (this._snapInteraction) {
    this.removeInteraction(this._snapInteraction);
    this._snapInteraction = null;
  }
  //rimove l'interazione e setta a null drawInteracion
  this.removeInteraction(this.drawInteraction);
  this.drawInteraction = null;
  // rtirna semprte true
  return true;
};


module.exports = AddFeatureTask;