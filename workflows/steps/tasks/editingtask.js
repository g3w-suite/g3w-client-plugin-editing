const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const Task = g3wsdk.core.workflow.Task;

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

proto.createSnapInteraction = function({dependency=[]}) {
  const dependencyFeatures = this.getDependencyFeatures(dependency);
  return new ol.interaction.Snap({
    features: new ol.Collection(dependencyFeatures)
  });
};

proto.getDependencyFeatures = function(dependency) {
  return dependency.flatMap((_dependency) => _dependency.getSource().getFeatures());

};

proto.removeFromOrphanNodes = function({layerId, id}) {
  const EditingService = require('../../../services/editingservice');
  const orphannodes = EditingService.getOrphanNodes();
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

module.exports = EditingTask;
