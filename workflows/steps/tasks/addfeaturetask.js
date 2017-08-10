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
  this.drawInteraction = new ol.interaction.Draw({
    type: source.getFeatures()[0].getGeometry().getType(), // il tipo lo prende dal geometry type dell'editing vetor layer che a sua volta lo prende dal tipo si geometry del vector layer originale
    source: source, // lo faccio scrivere su una source temporanea (non vado a modificare il source featuresstore)
    condition: this._condition,
    finishCondition: this._finishCondition // disponibile da https://github.com/openlayers/ol3/commit/d425f75bea05cb77559923e494f54156c6690c0b
  });
  // vado a riscrivere lo startDrawing
  this.drawInteraction.startDrawing_ = function(event) {
    var start = event.coordinate;
    this.finishCoordinate_ = start;
    if (this.mode_ === ol.interaction.Draw.Mode_.POINT) {
      this.sketchCoords_ = start.slice();
    } else if (this.mode_ === ol.interaction.Draw.Mode_.POLYGON) {
      this.sketchCoords_ = [[start.slice(), start.slice()]];
      this.sketchLineCoords_ = this.sketchCoords_[0];
    } else {
      this.sketchCoords_ = [start.slice(), start.slice()];
      if (this.mode_ === ol.interaction.Draw.Mode_.CIRCLE) {
        this.sketchLineCoords_ = this.sketchCoords_;
      }
    }
    if (this.sketchLineCoords_) {
      this.sketchLine_ = new ol.Feature(
        new ol.geom.LineString(this.sketchLineCoords_));
    }
    var geometry = this.geometryFunction_(this.sketchCoords_);
    this.sketchFeature_ = new Feature({
      feature: new ol.Feature()
    });
    this.sketchFeature_.setId('__new__'+Date.now());
    // lo setto come add feature lo state
    this.sketchFeature_.add();
    if (this.geometryName_) {
      this.sketchFeature_.setGeometryName(this.geometryName_);
    }
    this.sketchFeature_.setGeometry(geometry);
    this.updateSketchFeatures_();
    this.dispatchEvent(new ol.interaction.Draw.Event(
      ol.interaction.DrawEventType.DRAWSTART, this.sketchFeature_));
  };

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
    // devo creare un clone per evitare che quando eventualmente sposto la feature appena aggiunta
    // questa non sovrascriva le feature nuova originale del primo update
    var feature = e.feature.clone();
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