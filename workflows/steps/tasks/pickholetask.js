import { PickFeaturesInteraction } from '../../../interactions/pickfeaturesinteraction';
const { base, inherit }  = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function PickHoleTask(options={}) {
  this._options = {
    highlight: options.highlight || false,
    multi: options.multi || false
  };
  this.pickFeatureInteraction = null;
  this._busy = false;
  this._tools = options.tools || [];
  base(this, options);
}

inherit(PickHoleTask, EditingTask);

const proto = PickHoleTask.prototype;

proto.run = function(inputs) {
  const d = $.Deferred();
  const editingLayer = inputs.layer.getEditingLayer();

  this.pickFeatureInteraction = new PickFeaturesInteraction({
    layer: editingLayer,
  });

  this.addInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction.on('picked', evt => {
    const {features, coordinate} = evt;
    if (inputs.features.length === 0) {
      inputs.features = features;
      inputs.coordinate = coordinate;
    }
    this.setAndUnsetSelectedFeaturesStyle({
      promise: d
    });

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
