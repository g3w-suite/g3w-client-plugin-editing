const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const Task = g3wsdk.core.workflow.Task;

function EditingTask(options) {
  options = options || {};
  base(this, options);
  // da vedere meglio
  this._mapService = GUI.getComponent('map').getService();
  this.addInteraction = function(interaction) {
    this._mapService.addInteraction(interaction);
  };
// rimuovo un'interazione
  this.removeInteraction = function(interaction) {
    this._mapService.removeInteraction(interaction);
  };
}

inherit(EditingTask, Task);

const proto = EditingTask.prototype;

proto.run = function(inputs, context) {
  //TODO
};

proto.stop = function() {
  //TODO
};

module.exports = EditingTask;
