var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;

function EditingTask(options) {
  options = options || {};
  // da vedere meglio
  this._mapService = GUI.getComponent('map').getService();
  this.addInteraction = function(interaction) {
    this._mapService.addInteraction(interaction);
  };
// rimuovo un'interazione
  this.removeInteraction = function(interaction) {
    this._mapService.removeInteraction(interaction);
  };
  base(this);
}

inherit(EditingTask, G3WObject);

var proto = EditingTask.prototype;

// metodo di fine editing
proto.stop = function() {
  return true;
};

// metodo che deve essere sovrascritto dalle
// sottoclassi
proto.run = function() {
  console.log('Se appare quasto messaggio significa che non è stato sovrascritto il metodo run() dalla sottoclasse');
};

module.exports = EditingTask;
