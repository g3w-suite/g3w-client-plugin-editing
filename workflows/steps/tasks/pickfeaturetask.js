var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;
var EditingTask = require('./editingtask');

function PickFeatureTask(options={}) {
  this._one = options.one || false;
  this.pickFeatureInteraction = null;
  this._busy = false;
  this._tools = options.tools || [];
  base(this, options);
}

inherit(PickFeatureTask, EditingTask);

var proto = PickFeatureTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  //console.log('Pick Feature Task run ....');
  const d = $.Deferred();
  const layers = [inputs.layer];
  const features = inputs.features.length ? inputs.features : null;
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers,
    features
  });
  // aggiungo
  this.addInteraction(this.pickFeatureInteraction);
  // gestisco l'evento
  this.pickFeatureInteraction.on('picked', function(e) {
    const feature = e.feature;
    const feature_coordinates = [];
    if (!this._one) {
      const allfeatures = inputs.layer.getSource().getFeatures();
      // get coordinates of feature
      const coordinates = feature.getGeometry().getCoordinates();
      coordinates.forEach((coordinate) => {
        feature_coordinates.push(coordinate.toString())
      });
      for (let i = 0; i < allfeatures.length; i ++) {
        const _feature = allfeatures[i];
        const coordinates = _feature.getGeometry().getCoordinates();
        let find = false;
        find = coordinates.find((coordinate) => {
          return !!feature_coordinates.find((feature_coordinate) => {
            return coordinate.toString() === (feature_coordinate);
          });
        });
        if (!!find)
          inputs.features.push(_feature);
      }
    } else {
      inputs.features.push(feature);
    }
    d.resolve(inputs);
  });
  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  //console.log('Stop pick feature');
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};


module.exports = PickFeatureTask;
