var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var noop = g3wsdk.core.utils.noop;
var PickFeatureInteraction = g3wsdk.ol3.interactions.PickFeatureInteraction;

var EditingTask = require('./editingtask');

function PickFeatureTask(options) {
  var self = this;
  this.isPausable = true;
  this.pickFeatureInteraction = null;
  this._running = false;
  this._busy = false;
  this._originalFeatureStyle = null;
  base(this, options);
}

inherit(PickFeatureTask, EditingTask);

var proto = PickFeatureTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function() {
  var self = this;
  var d = $.Deferred();
  var defaultStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 5,
      fill: new ol.style.Fill({
        color: 'red'
      })
    })
  });
  var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.edit : null;
  // vado a settare i layers su cui faccio l'interacion agisce
  var layers = [this.editor.getVectorLayer().getMapLayer(),this.editor.getEditVectorLayer().getMapLayer()];
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers: layers
  });
  this.pickFeatureInteraction.on('picked', function(e) {
    self.editor.setPickedFeature(e.feature);
    if (!self._busy) {
      e.feature.setStyle(style);
      self._busy = true;
      self.pause(true);
      self.pickFeature(e.feature)
      .then(function(res) {
        self._busy = false;
        self.pause(false);
      })
    }
  });
  
  this.addInteraction(this.pickFeatureInteraction);
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this.pickFeatureInteraction.setActive(false);
  }
  else {
    this.pickFeatureInteraction.setActive(true);
  }
};
// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

module.exports = PickFeatureTask;