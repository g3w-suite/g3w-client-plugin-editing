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

proto.checkOrphanNodes = function(layer1, layernode) {
  const EditingService = require('../../../services/editingservice');
  const nodes = layernode.getSource().getFeatures();
  const orphannodes = nodes.filter((node) => {
    const coordinate = node.getGeometry().getCoordinates();
    const map = this._mapService.getMap();
    const pixel = map.getPixelFromCoordinate(coordinate);
    return !map.forEachFeatureAtPixel(pixel, (feature) => {
      return feature;
    }, {
      layerFilter: (layer) => {
        return layer === layer1
      }
    });
  });
  
  EditingService.setOrphanNodes(orphannodes);
};

module.exports = EditingTask;
