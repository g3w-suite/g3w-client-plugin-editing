const {base, inherit} = g3wsdk.core.utils;
const EditingTask = require('./editingtask');
const {GUI} = g3wsdk.gui;
const {PickFeatureInteraction} = g3wsdk.ol.interactions;


function LinkRelationTask(options={}) {
  base(this, options);
}

inherit(LinkRelationTask, EditingTask);

const proto = LinkRelationTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  GUI.setModal(false);
  const editingLayer = inputs.layer.getEditingLayer();
  this._originalLayerStyle = editingLayer.getStyle();
  const beforeRun = context.beforeRun;
  const promise = beforeRun && typeof beforeRun === 'function' ? beforeRun() : Promise.resolve();

  const {excludeFeatures} = context;

  const style = context.style;

  this._features = editingLayer.getSource().getFeatures();

  if (excludeFeatures) {
    this._features = this._features
      .filter(feature => {
        return Object
          .entries(excludeFeatures)
          .reduce((bool, [field, value]) => bool && feature.get(field) != value, true)
      })
  }

  if (style) {
    this._features.forEach(feature =>feature.setStyle(style));
  }
  promise.then(()=> {
    this.pickFeatureInteraction = new PickFeatureInteraction({
      layers: [editingLayer],
      features: this._features
    });
    this.addInteraction(this.pickFeatureInteraction);
    this.pickFeatureInteraction.on('picked', evt => {
      const relation = evt.feature;
      inputs.features.push(relation);
      GUI.setModal(true);
      d.resolve(inputs);
    });
  }).catch(err => d.reject(err));
  return d.promise()
};

proto.stop = function() {
  GUI.setModal(true);
  this.removeInteraction(this.pickFeatureInteraction);
  this._features
    .forEach(feature => feature.setStyle(this._originalLayerStyle));

  this.pickFeatureInteraction = null;
  this._features = null;
  this._originalLayerStyle = null;
  return true;
};

module.exports = LinkRelationTask;
