var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;

var EditingTool = require('./editingtask');

function MoveFeatureTask(options){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this._origGeometry = null;

  this.setters = {
    moveFeature: {
      fnc: MoveFeatureTask.prototype._moveFeature,
      fallback: MoveFeatureTask.prototype._fallBack
    }
  };
  
  base(this, options);
}
inherit(MoveFeatureTask, EditingTask);


var proto = MoveFeatureTask.prototype;

proto.run = function(){
  var self = this;
  var layers = [this.editor.getVectorLayer().getMapLayer(),this.editor.getEditVectorLayer().getMapLayer()];
  var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.move : null;
  this._selectInteraction = new ol.interaction.Select({
    layers: layers,
    condition: ol.events.condition.click,
    style: style,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
  this.addInteraction(this._selectInteraction);
  this._translateInteraction = new ol.interaction.Translate({
    features: this._selectInteraction.getFeatures(),
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
  this.addInteraction(this._translateInteraction);
  
  this._translateInteraction.on('translatestart',function(e){
    var feature = e.features.getArray()[0];
    self._origGeometry = feature.getGeometry().clone();
    self.editor.emit('movestart',feature);
  });
  
  this._translateInteraction.on('translateend',function(e){
    var feature = e.features.getArray()[0];
    //try {
      if (!self._busy){
        self._busy = true;
        self.pause();
        self.moveFeature(feature)
        .then(function(res){
          self.pause(false);
        })
        .fail(function(){
          feature.setGeometry(self._origGeometry);
        });
      }
  });

};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._selectInteraction.setActive(false);
    this._translateInteraction.setActive(false);
  }
  else {
    this._selectInteraction.setActive(true);
    this._translateInteraction.setActive(true);
  }
};

proto.stop = function(){
  this._selectInteraction.getFeatures().clear();
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
  return true;
};

proto._moveFeature = function(feature) {
  this.editor.emit('moveend',feature);
  this.editor.moveFeature(feature);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

module.exports = MoveFeatureTask;