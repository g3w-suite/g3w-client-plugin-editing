const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const Task = g3wsdk.core.workflow.Task;

function EditingTask(options = {}) {
  base(this, options);
  this._editingServive;
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

proto.setSteps = function(steps={}){
  this._steps = steps;
  this.setUserMessageSteps(steps);
};

proto.getMap = function() {
  return this._mapService.getMap();
};

proto.disableSidebar = function(bool=true) {
  !this._isContentChild && GUI.disableSideBar(bool);
};

proto.getEditingService = function() {
  this._editingServive = this._editingServive || require('../../../services/editingservice');
  return this._editingServive;
};

proto.fireEvent = function(event, options={}) {
  return this.getEditingService().fireEvent(event, options);
};
proto.run = function(inputs, context) {};

proto.stop = function() {};

module.exports = EditingTask;
