var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var PickFeatureInteraction = g3wsdk.ol3.interactions.PickFeatureInteraction;

var EditingTask = require('./editingtask');

function ModifyGeometryVertexTask(options){
  var self = this;
  options = options || {};
  this.isPausable = true;null;
  this.layer = null;
  this.drawInteraction = null;
  this._selectInteraction= null;
  this._deleteCondition = options.deleteCondition || undefined;
  this._snap = options.snap || null;
  this._snapInteraction = null;
  base(this, options);
}

inherit(ModifyGeometryVertexTask, EditingTask);


var proto = ModifyGeometryVertexTask.prototype;

proto.run = function(inputs, context) {
  var self = this;
  var d = $.Deferred();
  this.layer = inputs.layer;
  var session = context.session;
  var originalFeature,
    newFeature;
  //var style = this.editor._editingVectorStyle ? this.editor._editingVectorStyle.move : null;
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer],
    condition: ol.events.condition.click,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
  this.addInteraction(this._selectInteraction);

  this._modifyInteraction = new ol.interaction.Modify({
    features: this._selectInteraction.getFeatures(),
    deleteCondition: this._deleteCondition
  });
  
  this.addInteraction(this._modifyInteraction);
  
  this._modifyInteraction.on('modifystart', function(e) {
    var feature = e.features.getArray()[0];
    originalFeature = feature.clone();
    originalFeature.update();
  });
  
  this._modifyInteraction.on('modifyend',function(e){
    var feature = e.features.getArray()[0];
    if (feature.getGeometry().getExtent() != originalFeature.getGeometry().getExtent()) {
      newFeature = feature.clone();
      newFeature.update();
      // vado ad aggiungere la featurea alla sessione (parte temporanea)
      session.push(newFeature, originalFeature);
      self._selectInteraction.getFeatures().clear();
      inputs.features.push(newFeature);
      // ritorno come outpu l'input layer che sarà modificato
      d.resolve(inputs);
    }
  });
  
  if (this._snap) {
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
  }
  return d.promise();
};


proto.stop = function(){
  if (this._snapInteraction){
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  return true;
};


proto.removePoint = function(coordinate){
  if (this._modifyInteraction) {
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this._modifyInteraction.removePoint();
    }
    catch (e){
      console.log(e);
    }
  }
};



proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};

module.exports = ModifyGeometryVertexTask;