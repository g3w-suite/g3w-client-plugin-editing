const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');
const GUI = g3wsdk.gui.GUI;
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;


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
  const {field, value, pk} = context.exclude;
  const style = context.style;
  this._features = editingLayer.getSource().getFeatures();
  this._features = field ? this._features.filter(feature => {
    return  pk ? feature.getId() != value : feature.get(field) != value;
  }) : this._features;
  style && this._features.forEach(feature =>{
    feature.setStyle(style)
  });
  promise.then(()=> {
    this.pickFeatureInteraction = new PickFeatureInteraction({
      layers: [editingLayer],
      features: this._features
    });
    this.addInteraction(this.pickFeatureInteraction);
    this.pickFeatureInteraction.on('picked', (e) => {
      const relation = e.feature;
      inputs.features.push(relation);
      GUI.setModal(true);
      d.resolve(inputs);
    });
  }).catch(()=>{
    d.reject();
  });
  return d.promise()
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  GUI.setModal(true);
  this.removeInteraction(this.pickFeatureInteraction);
  this._features.forEach(feature => {
    feature.setStyle(this._originalLayerStyle);
  });
  this.pickFeatureInteraction = null;
  this._features = null;
  this._originalLayerStyle = null;
  return true;
};


module.exports = LinkRelationTask;
