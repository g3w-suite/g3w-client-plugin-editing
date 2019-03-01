const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const Task = g3wsdk.core.workflow.Task;
const Feature = g3wsdk.core.layer.features.Feature;

function EditingTask(options = {}) {
  base(this, options);
  this._mapService = GUI.getComponent('map').getService();
  this.addInteraction = function(interaction) {
    this._mapService.addInteraction(interaction);
  };
  this.removeInteraction = function(interaction) {
    this._mapService.removeInteraction(interaction);
  };
}

inherit(EditingTask, Task);

const proto = EditingTask.prototype;

proto.run = function(inputs, context) {};

proto.stop = function() {};

proto.isBranchLayer = function(layerId) {
  const EditingService = require('../../../services/editingservice');
  return EditingService.isBranchLayer(layerId);
};

proto.getChartComponent = function({feature}={}) {
  const EditingService = require('../../../services/editingservice');
  return EditingService.runProgeoApiMethod({
    name:'getChartComponent',
    options: {
      feature
    }
  });
};

proto.createLossFeatureWithDegree = function({session, coordinate, degree, branch_id} = {}) {
  const EditingService = require('../../../services/editingservice');
  const layerFields = EditingService.getBranchLayersDependenciesFields();
  for (const layerId in layerFields) {
    const field = layerFields[layerId][0];
    const toolbox = EditingService.getToolBoxById(layerId);
    const pk = toolbox.getLayer().getPk();
    const geometry = new ol.geom.Point(coordinate);
    const feature = new Feature({
      feature: new ol.Feature({
        geometry,
      }),
      pk
    });
    toolbox.getLayer().isPkEditable() ?  feature.setNew() : feature.setTemporaryId();
    feature.set(field, degree);
    feature.set('branch_id', branch_id);
    const source = toolbox.getEditingLayer().getSource();
    source.addFeature(feature);
    feature.setNew();
    session.pushAdd(layerId, feature);
  }
};

proto.createSnapInteraction = function({dependency=[]}) {
  const dependencyFeatures = this.getDependencyFeatures(dependency);
  return new ol.interaction.Snap({
    features: new ol.Collection(dependencyFeatures)
  });
};

proto.getDependencyFeatures = function(dependency) {
  return dependency.flatMap((_dependency) => _dependency.getSource().getFeatures());
};

proto.setBranchId = function({feature, dependency}) {
  const map = this._mapService.getMap();
  let branch_feature;
  const branch_layer = dependency[0];
  const coordinate = feature.getGeometry().getCoordinates();
  const pixel = map.getPixelFromCoordinate(coordinate);
  const branch_features = map.getFeaturesAtPixel(pixel, {
      layerFilter: function(layer) {
        return branch_layer === layer
      }
  });
  if (branch_features.length === 1)
    branch_feature = branch_features[0];
  else {
    for (i = 0; i < branch_features.length; i++) {
      branch_feature = branch_features[i];
      branch_feature_coordinate = branch_feature.getGeometry().getCoordinates();
      if (coordinate.toString() === branch_feature_coordinate[1].toString())
        break;
    }
  }
  feature.set('branch_id', branch_feature.getId());
};

proto.removeFromOrphanNodes = function({layerId, id}) {
  const EditingService = require('../../../services/editingservice');
  const orphannodes = EditingService.getOrphanNodesById({
    layerId,
    id
  });
  const filterednodes = orphannodes.filter((node) => {
    return node.getId() !== id;
  });
  EditingService.setOrphanNodes({
    layerId,
    nodes: filterednodes
  });
};

proto.checkOrphanNodes = function() {
  const EditingService = require('../../../services/editingservice');
  EditingService.checkOrphanNodes();
};

proto.checkLossesToDelete = function({l}) {

}
;

module.exports = EditingTask;
