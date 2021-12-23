const {base, inherit} = g3wsdk.core.utils;
const {isPointGeometryType} = g3wsdk.core.geometry.Geometry;
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;

const EditingTask = require('./editingtask');

function ModifyFeatureTask(options={}){
  this.drawInteraction = null;
  this._deleteCondition = options.deleteCondition || undefined;
  this._snap = options.snap || null;
  this._snapInteraction = null;
  base(this);
}

inherit(ModifyFeatureTask, EditingTask);


const proto = ModifyFeatureTask.prototype;

proto.run = function() {
  let origGeometry = null;
  this.pickedFeatures = new ol.Collection;
  const layers = [this.layer];
  if (this.getEditingService().getLayerFeaturesId() === this.layer.getId()){
    const vertexLayer = this.getEditingService().getToolBoxById(this.getEditingService().getLayerVertexId()).getEditingLayer();
    layers.push(vertexLayer);
  }
  this._pickInteraction = new PickFeatureInteraction({
    layers
  });

  this.addInteraction(this._pickInteraction);

  this._pickInteraction.on('picked', evt =>{
    this.pickedFeatures.clear();
    this.pickedFeatures.push(evt.feature);
  });

  this._modifyInteraction = new ol.interaction.Modify({
    features: this.pickedFeatures,
    deleteCondition: this._deleteCondition
  });

  this.addInteraction(this._modifyInteraction);

  this._modifyInteraction.on('modifystart', (e) => {
    const feature = e.features.getArray()[0];
    origGeometry = feature.getGeometry().clone();
  });

  this._modifyInteraction.on('modifyend', evt => {
    const feature = evt.features.getArray()[0];
    const isNew = feature.isNew();
    //try {
      if (!this._busy) {
        this._busy = true;
        this.pause(true);
        this.modifyFeature(feature, isNew)
        .fail(() => {
          feature.setGeometry(origGeometry);
        })
        .always(() => {
          this._busy = false;
          this.pause(false);
        })
      }
  });

  if (this._snap) {
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
  }
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    if (this._snapInteraction){
      this._snapInteraction.setActive(false);
    }
    this._pickInteraction.setActive(false);
    this._modifyInteraction.setActive(false);
  }
  else {
    if (this._snapInteraction){
      this._snapInteraction.setActive(true);
    }
    this._pickInteraction.setActive(true);
    this._modifyInteraction.setActive(true);
  }
};

proto.stop = function(){
  this.pickedFeatures.clear();
  if (this._snapInteraction){
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this._pickInteraction);
  this._pickInteraction = null;
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  return true;
};

proto._modifyFeature = function(feature, isNew){
  // aggionro la geometria nel buffer di editing
  this.editor.updateFeature(feature, isNew);
  this._busy = false;
  this.pause(false);
  return true;
};

proto.removePoint = function(){
  if (this._modifyInteraction){
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this._modifyInteraction.removePoint();
    }
    catch (e){
      console.log(e);
    }
  }
};


module.exports = ModifyFeatureTask;
