const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function ModifyGeometryVertexTask(options={}){
  this.drawInteraction = null;
  this._originalStyle = null;
  this._snapInteraction = null;
  this._dependency = options.dependency;
  base(this, options);
}

inherit(ModifyGeometryVertexTask, EditingTask);

const proto = ModifyGeometryVertexTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const editingLayer = inputs.layer;
  const session = context.session;
  const originalLayer = context.layer;
  const layerId = originalLayer.getId();
  let modifiedBranchFeatures = [];
  const originalBranchFeatures = [];
  let dependencyOriginalFeatures = [];
  let dependencyFeatures = [];
  let startKey;
  const source = editingLayer.getSource();
  let canStartModify = true; // condizione che mi permette di avviare tutta la procedura del modifyfeature
  this._modifyInteraction = new ol.interaction.Modify({
    source,
    insertVertexCondition() {
      canStartModify = false;
      return ol.events.condition.never()
    }
  });
  this.addInteraction(this._modifyInteraction);
  this._snapInteraction = new ol.interaction.Snap({
    source
  });
  this.addInteraction(this._snapInteraction);
  this._modifyInteraction.on('modifystart', function(evt) {
    if (!canStartModify){
      d.reject();
      return;
    }
    const {pixel} = evt.mapBrowserEvent;
    const map = this.getMap();
    modifiedBranchFeatures = map.getFeaturesAtPixel(pixel, {
      layerFilter: (layer) => {
        return layer === editingLayer;
      },
      hitTolerance: 10
    });
    if (modifiedBranchFeatures) {
      modifiedBranchFeatures.forEach((feature) => {
        originalBranchFeatures.push(feature.clone())
      });
      map.forEachFeatureAtPixel(pixel, (feature, layer) => {
          if (layer) {
            dependencyFeatures.push({
              layerId: layer.get('id'),
              feature
            })
          }
        }, {
          layerFilter: (layer) => {
            return layer !== editingLayer;
          },
          hitTolerance: 10
        }
      );
      if (dependencyFeatures.length) {
        dependencyFeatures.forEach(dependencyFeature => {
          dependencyOriginalFeatures.push(dependencyFeature.feature.clone());
        });
        startKey = map.on('pointerdrag', (evt) => {
          dependencyFeatures.forEach(dependencyFeature => {
            dependencyFeature.feature.getGeometry().setCoordinates(evt.coordinate)
          })
        })
      }
    } else {
      d.reject()
    }
  });

  this._modifyInteraction.on('modifyend', (evt) => {
    const featuresLength =  modifiedBranchFeatures.length;
    for (let i = 0; i < featuresLength; i++) {
      const feature =  modifiedBranchFeatures[i];
      const newFeature = feature.clone();
      const originalFeature = originalBranchFeatures[i];
      session.pushUpdate(layerId, newFeature, originalFeature);
      inputs.features.push(newFeature);
    }
    if (dependencyFeatures) {
      for (let i = 0; i < dependencyFeatures.length; i++) {
        const {layerId, feature:dependencyFeature} = dependencyFeatures[i];
        const newFeature = dependencyFeature.clone();
        session.pushUpdate(layerId, newFeature, dependencyOriginalFeatures[i]);
      }
    }
    // considero sostamento solo se tra due branch
    if (featuresLength ===  2) {
      this.runBranchMethods({
        action:'update_geometry',
        feature: dependencyFeatures,
        session
      }, {
        snapFeatures: modifiedBranchFeatures
      })
    }
    ol.Observable.unByKey(startKey);
    this.checkOrphanNodes();
    d.resolve(inputs);
  });
  return d.promise();
};

proto.stop = function(){
  if (this._snapInteraction) {
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  return true;
};

module.exports = ModifyGeometryVertexTask;
