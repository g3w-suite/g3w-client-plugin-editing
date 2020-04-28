const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function MoveElementsTask(options={}){
  base(this, options);
}

inherit(MoveElementsTask, EditingTask);

const proto = MoveElementsTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const { layer, features, coordinates } = inputs;
  const source = layer.getEditingLayer().getSource();
  const layerId = layer.getId();
  const session = context.session;
  this._snapIteraction = new ol.interaction.Snap({
    source,
    edge: false
  });

  this._drawInteraction = new ol.interaction.Draw({
    type: 'Point',
    features: new ol.Collection(),
  });

  this._drawInteraction.on('drawend', (evt)=> {
    const [x, y] = evt.feature.getGeometry().getCoordinates();
    const deltaXY = {
      x: x - coordinates[0],
      y: y - coordinates[1]
    };

    for (let i =0; i < features.length; i++) {
      const feature = features[i].cloneNew();
      feature.getGeometry().translate(deltaXY.x, deltaXY.y);
      source.addFeature(feature);
      layer.isPkEditable()
      const newFeature = session.pushAdd(layerId, feature);
      if (layer.isPkEditable) {
        inputs.newFeature = newFeature;
        inputs.features = [feature];
      }
    }
    this._steps.to.done = true;
    d.resolve(inputs)
  });

  this.addInteraction(this._drawInteraction);
  this.addInteraction(this._snapIteraction);
  return d.promise();
};
proto.stop = function() {
  this.removeInteraction(this._drawInteraction);
  this.removeInteraction(this._snapIteraction);
  this._drawInteraction = null;
  this._snapIteraction = null;
  return true;
};


module.exports = MoveElementsTask;
