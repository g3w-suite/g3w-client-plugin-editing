const {base, inherit} = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function GetVertexTask(options={}) {
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
    condition: evt => {
      const coordinates = evt.coordinate;
      return !!features.find(feature => this.areCoordinatesEqual({feature, coordinates}));
    }
  });
  this._drawIteraction.on('drawend', (evt)=> {
    inputs.coordinates = evt.feature.getGeometry().getCoordinates();
    this.setUserMessageStepDone('from');
    d.resolve(inputs);
  });

  this.addInteraction(this._drawIteraction);
  this.addInteraction(this._snapIteraction);

  return d.promise();
};

proto.stop = function() {
  this.removeInteraction(this._drawIteraction);
  this.removeInteraction(this._snapIteraction);
  this._snapIteraction = null;
  this._drawIteraction = null;
};

module.exports = GetVertexTask;
