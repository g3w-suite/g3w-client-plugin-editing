var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Feature = g3wsdk.core.layer.features.Feature;
var EditingTask = require('./editingtask');

function MoveFeatureTask(options){
  var self = this;
  this._layer = null;
  this.drawInteraction = null;
  base(this, options);
}

inherit(MoveFeatureTask, EditingTask);


var proto = MoveFeatureTask.prototype;

proto.run = function(inputs, context) {
  var self = this;
  var d = $.Deferred();
  var session = context.session;
  var layers = [inputs.layer];
  var originalFeature = null;
  var style = null;
  //var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.move : null;
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
    // repndo la feature di partenza
    originalFeature = feature.clone();
    originalFeature.update();
  });
  
  this._translateInteraction.on('translateend',function(e) {
    var newFeature = e.features.getArray()[0].clone();
    newFeature.update();
    // vado ad aggiungere la featurea alla sessione (parte temporanea)
    session.push({
      layerId: session.getId(),
      feature: newFeature
    }, {
      layerId: session.getId(),
      feature:originalFeature
    });
    //dovrei aggiungere qui qualcosa per salvare temporaneamente quesa modifica sulla sessione al fine di
    // portare tutte le modifiche quando viene fatto il save della sessione
    self._selectInteraction.getFeatures().clear();
    // ritorno come outpu l'input layer che sarà modificato
    inputs.features.push(newFeature);
    d.resolve(inputs);
  });
  return d.promise()
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

proto.stop = function() {
  var d = $.Deferred();
  this._selectInteraction.getFeatures().clear();
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
  d.resolve();
  return d.promise();
};



module.exports = MoveFeatureTask;