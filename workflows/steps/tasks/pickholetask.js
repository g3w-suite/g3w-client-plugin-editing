import { PickHolesInteraction } from '../../../interactions/pickholesinteraction';
const {
  base,
  inherit
}                 = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function PickHoleTask(options={}) {
  this.pickFeatureInteraction = null;
  base(this, options);
}

inherit(PickHoleTask, EditingTask);

const proto = PickHoleTask.prototype;

proto.run = function(inputs) {

  const d = $.Deferred();

  //get OL editing layer
  const editingLayer = inputs.layer.getEditingLayer();

  this.pickFeatureInteraction = new PickHolesInteraction({
    layer: editingLayer,
    geometryType: inputs.layer.getEditingGeometryType()

  });

  this.addInteraction(this.pickFeatureInteraction);

  this.pickFeatureInteraction
    .on('picked', evt => {
      const {features, coordinate} = evt;
      if (inputs.features.length === 0) {
        inputs.features = features;
        inputs.coordinate = coordinate;
      }
      this.setAndUnsetSelectedFeaturesStyle({promise: d});

    if (this._steps) {
      this.setUserMessageStepDone('select');
    }

    d.resolve(inputs);
  });

  return d.promise()
};

proto.stop = function() {
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};

module.exports = PickHoleTask;
