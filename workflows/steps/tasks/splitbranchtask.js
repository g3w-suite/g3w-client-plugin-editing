const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;
const EditingTask = require('./editingtask');

function SplitBranchTask(options={}){
  base(this, options);
}

inherit(SplitBranchTask, EditingTask);

module.exports = SplitBranchTask;

const proto = SplitBranchTask.prototype;
// funzione che viene chiamata quando viene eseguita il setTool dell'editor
proto.run = function(inputs, context) {
  const d = $.Deferred();
  const editingLayer = inputs.layer;
  //recupero la sessione dal context
  const session = context.session;
  const originalLayer = context.layer;
  const layerId = originalLayer.getId();
  const source = editingLayer.getSource();
  this._interaction = new PickFeatureInteraction({
    layers: [editingLayer]
  });
  this._interaction.on('picked', (evt)=> {
    const originalFeature = evt.feature;
    const coordinates = originalFeature.getGeometry().getClosestPoint(evt.coordinate);
    const splittedFeature = originalFeature.clone();
    const newFeature = originalFeature.clone();
    newFeature.setTemporaryId();
    const originalCoordinates = originalFeature.getGeometry().getCoordinates();
    newFeature.getGeometry().setCoordinates([coordinates, originalCoordinates[1]]);
    splittedFeature.getGeometry().setCoordinates([originalCoordinates[0], coordinates]);
    [newFeature, splittedFeature].forEach((feature) => {
      feature.set('pipes', undefined);
      this.setBranchProfileData({
        feature
      });
    });
    session.pushUpdate(layerId, splittedFeature, originalFeature);
    session.pushAdd(layerId, newFeature);
    source.addFeature(newFeature);
    this.runBranchMethods({
      action: 'add',
      session,
      feature: newFeature,
    }, {
      snapFeatures:[splittedFeature]
    });
    d.resolve(inputs)
  });
  this.addInteraction(this._interaction);
  return d.promise();
};


proto.stop = function() {
  this.removeInteraction(this._interaction);
  return Promise.resolve();
};

