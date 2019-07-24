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
  const self = this;
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
  const features = editingLayer.getSource().getFeaturesCollection(); // passo la feature collection
  this._modifyInteraction = new ol.interaction.Modify({
    features,
    insertVertexCondition: ol.events.condition.never,
    pixelTolerance: 1
  });
  this.addInteraction(this._modifyInteraction);
  this._snapInteraction = new ol.interaction.Snap({
    features,
    edge: false
  });
  this.addInteraction(this._snapInteraction);
  this._modifyInteraction.on('modifystart', function(evt) {
    const {pixel, coordinate} = evt.mapBrowserEvent;
    const map = this.getMap();
    modifiedBranchFeatures = map.getFeaturesAtPixel(pixel, {
      layerFilter: (layer) => {
        return layer === editingLayer;
      },
      hitTolerance: 10
    });
    if (modifiedBranchFeatures) {
      //check if evt coordinate is a vertex of the feature
      const coordinates = coordinate.toString();
      let isVertex = false;
      for (let i =0; i < modifiedBranchFeatures.length; i++) {
        const modifiedBranchFeatureCoordinates = modifiedBranchFeatures[i].getGeometry().getCoordinates();
        if (modifiedBranchFeatureCoordinates[0].toString() === coordinates || modifiedBranchFeatureCoordinates[1].toString() === coordinates) {
          isVertex = true;
          break;
        }
      }
      if (!isVertex) {
        d.reject();
        return;
      }
      modifiedBranchFeatures.forEach((feature) => {
        originalBranchFeatures.push(feature.clone())
      });

      if (modifiedBranchFeatures.length === 1) {
        self._createMeasureTooltip();
        const feature = modifiedBranchFeatures[0];
        const snapFeatures = self.getSnapBrachFeatures({
          feature
        });
        const snapBranchLenth = snapFeatures.length;
        self._registerPointerMoveEvent({
          feature,
          snapFeatures: snapBranchLenth > 1 || snapBranchLenth === 0 ? []: [snapFeatures[0].feature]
        });

      }
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
    this._clearMeasureTooltip();
    for (let i = 0; i < featuresLength; i++) {
      const feature =  modifiedBranchFeatures[i];
      feature.set('pipes', undefined);
      // set undefined to recall pispe from server
      const newFeature = feature;
      this.setBranchProfileData({
        feature: newFeature,
        update:true
      }).then(() => {
        const originalFeature = originalBranchFeatures[i];
        session.pushUpdate(layerId, newFeature, originalFeature);
        inputs.features.push(newFeature);
        let newDependencyFeatures = [];
        if (dependencyFeatures) {
          for (let i = 0; i < dependencyFeatures.length; i++) {
            const {layerId, feature:dependencyFeature} = dependencyFeatures[i];
            const newFeature = dependencyFeature.clone();
            const newDependecyFeature = {
              layerId,
              feature: newFeature
            };
            newDependencyFeatures.push(newDependecyFeature);
            session.pushUpdate(layerId, newFeature, dependencyOriginalFeatures[i]);
          }
        }
        // considero sostamento solo se tra due branch
        if (featuresLength ===  2) {
          this.runBranchMethods({
            action:'update_geometry',
            feature: newDependencyFeatures,
            session
          }, {
            snapFeatures: modifiedBranchFeatures
          })
        } else if (featuresLength === 1) {
          const snapFeatures = self.getSnapBrachFeatures({
            feature: modifiedBranchFeatures[0]
          });

          if (snapFeatures.length === 1) {
            const lossfeature = this.getLosseByCoordinatesBeforeRunBranchMethods({
              coordinates: snapFeatures[0].coordinates,
              action: 'update_geometry'
            });
            if (lossfeature) {
              this.runBranchMethods({
                action:'update_geometry',
                feature: [lossfeature],
                session
              }, {
                snapFeatures: [modifiedBranchFeatures[0], snapFeatures[0].feature]
              })
            }
          }
        }
        ol.Observable.unByKey(startKey);
        d.resolve(inputs);
      })
    }

  });
  return d.promise();
};

proto.stop = function() {
  if (this._snapInteraction) {
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  return true;
};

module.exports = ModifyGeometryVertexTask;
