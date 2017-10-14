var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var Task = g3wsdk.core.workflow.Task;

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

var proto = EditingTask.prototype;

proto.run = function(inputs, context) {
  //TODO
};

proto.stop = function() {
  //TODO
};

module.exports = EditingTask;
