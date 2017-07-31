var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTask = require('./editingtask');
var Feature = g3wsdk.core.layer.features.Feature;

// classe  per l'aggiuntadi feature
// eridita dalla classe padre EditingTool
function AddFeatureTask(options) {

  options = options || {};
  this._running = false;
  this._busy = false;
  // source del layer di editing
  // la drw interaction per disegnare la feature
  this.drawInteraction = null;
  this._snap = options.snap || null;
  this._snapInteraction = null;
  this._finishCondition = options.finishCondition || _.constant(true);
  this._condition = options.condition || _.constant(true);

  base(this, options);
}

inherit(AddFeatureTask, EditingTask);

module.exports = AddFeatureTask;

var proto = AddFeatureTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  console.log('Add task run.......');
  var self = this;
  var d = $.Deferred();
  this._layer = inputs.layer;
  //recupero la sessione dal context
  var session = context.session;
  //definisce l'interazione che deve essere aggiunta
  // specificando il layer sul quale le feature aggiunte devono essere messe
  var source = this._layer.getSource();
  this.drawInteraction = new ol.interaction.Draw({
    type: source.getFeatures()[0].getGeometry().getType(), // il tipo lo prende dal geometry type dell'editing vetor layer che a sua volta lo prende dal tipo si geometry del vector layer originale
    source: new ol.source.Vector(), // lo faccio scrivere su una source temporanea (non vado a modificare il source featuresstore)
    condition: this._condition,
    finishCondition: this._finishCondition // disponibile da https://github.com/openlayers/ol3/commit/d425f75bea05cb77559923e494f54156c6690c0b
  });
  //aggiunge l'interazione tramite il metodo generale di editor.js
  // che non fa altro che chaimare il mapservice
  this.addInteraction(this.drawInteraction);
  //setta attiva l'interazione
  this.drawInteraction.setActive(true);
  // viene settato sull'inizio del draw l'evento drawstart dell'editor
  this.drawInteraction.on('drawstart',function(e) {
    //TODO
  });
  // viene settato l'evento drawend
  this.drawInteraction.on('drawend', function(e) {
    console.log('Drawend .......');
    var feature = new Feature({
      feature: e.feature
    });
    feature.setId('__new__' + Date.now());
    //feature.setStyle(style);
    //var isNew = self._isNew(feature);
    // vado a rimuovera la feature
    // dico di cancellarla (la feature non viene cancellatata ma aggiornato il suo stato
    feature.add();
    // vado ad aggiungere la featurea alla sessione (parte temporanea)
    session.push(feature);
    d.resolve(self._layer);
    return feature
  });
  //snapping
  if (this._snap) {
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
  }
  return d.promise();
};

//metodo pausa
proto.pause = function(pause) {
  // se non definito o true disattiva (setActive false) le iteractions
  if (_.isUndefined(pause) || pause === true) {
    if (this._snapInteraction) {
      this._snapInteraction.setActive(false);
    }
    this.drawInteraction.setActive(false);
  } else {
    if (this._snapInteraction) {
      this._snapInteraction.setActive(true);
    }
    this.drawInteraction.setActive(true);
  }
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

proto.removeLastPoint = function() {
  if (this.drawInteraction) {
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this.drawInteraction.removeLastPoint();
    }
    catch (e) {
      //
    }
  }
};
// add Feature fnc setter function
proto._addFeature = function(feature) {
  // aggiungo la geometria nell'edit buffer
  //risetto allo style iniziale
  feature.setStyle(null);
  ////
  this._busy = false;
  this.pause(false);
  return true;
};
// funzione di call back del setter addFeature
proto._fallBack = function(feature) {
  this._busy = false;
  // rimuovo l'ultima feature inserita, ovvero quella disegnata ma che non si vuole salvare
  if (this.source.getFeaturesCollection().getLength()){
    this.source.getFeaturesCollection().pop();
    this.pause(false);
  }
};
