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
  // creo una source temporanea
  var temporarySource = new ol.source.Vector();
  this.drawInteraction = new ol.interaction.Draw({
    type: source.getFeatures()[0].getGeometry().getType(), // il tipo lo prende dal geometry type dell'editing vetor layer che a sua volta lo prende dal tipo si geometry del vector layer originale
    source: temporarySource, // lo faccio scrivere su una source temporanea (non vado a modificare il source featuresstore)
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
  });

  // viene settato l'evento drawend
  this.drawInteraction.on('drawend', function(e) {
    console.log('Drawend .......');
    var feature = new Feature({
      feature: e.feature
    });
    feature.setId('__new__'+Date.now());
    // lo setto come add feature lo state
    feature.add();
    // vado a aggiungerla
    source.addFeature(feature);
    //source.readFeatures().push(feature);
    // devo creare un clone per evitare che quando eventualmente sposto la feature appena aggiunta
    // questa non sovrascriva le feature nuova originale del primo update
    session.push({
      layerId : session.getId(),
      feature: feature
    });
    inputs.features.push(feature);
    d.resolve(inputs);
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

proto._removeLastPoint = function() {
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

module.exports = AddFeatureTask;