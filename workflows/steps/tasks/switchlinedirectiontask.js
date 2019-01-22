var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTask = require('./editingtask');

function SwitchLineDirectionTask(options={}) {
  base(this, options);
}

inherit(SwitchLineDirectionTask, EditingTask);

var proto = SwitchLineDirectionTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  //console.log('Pick Feature Task run ....');
  const d = $.Deferred();
  const session = context.session;
  const originalLayer = context.layer;
  const layerId = originalLayer.getId();
  const feature = inputs.features.length ? inputs.features[0] : null;
  if (feature) {
    const coordinates =  feature.getGeometry().getCoordinates();
    const originalFeature = feature.clone();
    feature.setGeometry(new ol.geom.LineString([coordinates[1], coordinates[0]]));
    const newFeature = feature.clone();
    session.pushUpdate(layerId, newFeature, originalFeature);
  }
  d.resolve(inputs);

  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  //console.log('Stop pick feature');
  return true;
};


module.exports = SwitchLineDirectionTask;
