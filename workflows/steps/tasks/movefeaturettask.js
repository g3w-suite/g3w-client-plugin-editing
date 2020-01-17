const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function MoveFeatureTask(options){
  this._modifyInteraction = null;
  this._snapingInteraction = null;
  this._dependency = options.dependency;
  base(this, options);
}

inherit(MoveFeatureTask, EditingTask);

const proto = MoveFeatureTask.prototype;

proto.run = function(inputs, context) {
  const self = this;
  const d = $.Deferred();
  const session = context.session;
  const editingLayer = inputs.layer;
  const originalLayer = context.layer;
  const layerId = originalLayer.getId();
  const layerName = originalLayer.getName();
  const originalStyle = editingLayer.getStyle();
  let originalFeature = null;
  let feature;
  const features = editingLayer.getSource().getFeaturesCollection();
  this._modifyInteraction = new ol.interaction.Modify({
    features
  });
  this.addInteraction(this._modifyInteraction);
  this._snapingInteraction = this.createSnapInteraction({
    dependency: this._dependency
  });

  this.addInteraction(this._snapingInteraction);
  this._modifyInteraction.on('modifystart', function(evt) {
    const map = this.getMap();
    const {pixel} = evt.mapBrowserEvent;
    feature = map.getFeaturesAtPixel(pixel, {
      layerFilter: (layer) => {
        return layer === editingLayer
      },
      hitTolerance: 5
    });
    if (feature) {
      feature = feature[0];
      originalFeature = feature.clone();
    } else
      d.reject()
  });

  this._modifyInteraction.on('modifyend', function(evt) {
    const pixel = evt.mapBrowserEvent.pixel;
    const coordinate = evt.mapBrowserEvent.coordinate;
    const map = evt.mapBrowserEvent.map;
    const vertexIndex = {
      Inlets: 0,
      OutLets: 1
    };
    const layerFilter = (layer) => {
      return !!self._dependency.find((dependency) => layer === dependency)
    };
    const dependencyFeature = map.forEachFeatureAtPixel(pixel, (feature) => {
      if (!feature)
        return false;
      if (layerName === 'Inlets' || layerName === 'OutLets') {
        const index = vertexIndex[layerName];
        const vertex = feature.getGeometry().getCoordinates()[index];
        const canDraw = vertex[0] === coordinate[0] && vertex[1] === coordinate[1];
        const features = this.getMap().getFeaturesAtPixel(pixel, {
          layerFilter
        });
        return features.length === 1 && canDraw ? feature : null;
      } else {
        return feature;
      }
    }, {
      layerFilter
    });
    if (dependencyFeature) {
      const newFeature = feature.clone();
      self.setFeatureBranchId({
        feature: newFeature,
        branch_id: dependencyFeature.getId()
      });
      session.pushUpdate(layerId, newFeature, originalFeature);
      inputs.features.push(newFeature);
      feature.setStyle(originalStyle);
      self.removeFromOrphanNodes({
        layerId,
        id:originalFeature.getId()
      });
      self.checkOrphanNodes();
      d.resolve(inputs);
    } else {
      feature.setGeometry(originalFeature.getGeometry());
      d.reject()
    }
  });
  return d.promise()
};

proto.stop = function() {
  const d = $.Deferred();
  this.removeInteraction(this._snapingInteraction);
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  d.resolve();
  return d.promise();
};

module.exports = MoveFeatureTask;
