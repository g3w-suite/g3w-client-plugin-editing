const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function GetVertexTask(options={}) {
  this._selectInteraction;
  this._drawInteraction;
  this._snapIteraction;
  base(this, options);
}

inherit(GetVertexTask, EditingTask);

const proto = GetVertexTask.prototype;

proto.run = function(inputs) {
  const d = $.Deferred();
  const {features} = inputs;
  if (!features.length) return;
  this._snapIteraction = new ol.interaction.Snap({
    features: new ol.Collection(features),
    edge: false
  });

  this._drawIteraction = new ol.interaction.Draw({
    type: 'Point',
    features: new ol.Collection(),
  });

  this._drawIteraction.on('drawend', (evt)=> {
    inputs.coordinates = evt.feature.getGeometry().getCoordinates();
    this.setUserMessageStepDone('from')
    d.resolve(inputs);
  });

  this.addInteraction(this._drawIteraction);
  this.addInteraction(this._snapIteraction);

  return d.promise();
};

proto.stop = function() {
  this.removeInteraction(this._selectInteraction);
  this.removeInteraction(this._snapIteraction);
  this._snapIteraction = null;
  this._selectInteraction = null;
  return true;
};

module.exports = GetVertexTask;
