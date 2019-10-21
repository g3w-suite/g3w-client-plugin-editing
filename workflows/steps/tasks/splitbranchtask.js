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
  this._interaction.on('picked', (evt) => {
    const feature = evt.feature;
    const originalFeature = feature.clone();
    const newFeature = feature.clone();
    newFeature.setTemporaryId();
    const originalCoordinates = feature.getGeometry().getCoordinates();
    const coordinates = feature.getGeometry().getClosestPoint(evt.coordinate);
    newFeature.getGeometry().setCoordinates([coordinates, originalCoordinates[1]]);
    feature.getGeometry().setCoordinates([originalCoordinates[0], coordinates]);
    const promisesProfiles = [newFeature, feature].map((feature) => {
      return this.setBranchProfileData({
        feature,
        step: feature.get('profile_step_default')
      });
    });
    Promise.all(promisesProfiles).then(()=> {
      session.pushUpdate(layerId, feature, originalFeature);
      session.pushAdd(layerId, newFeature);
      source.addFeature(newFeature);
      this.runBranchMethods({
        action: 'add',
        session,
        feature: newFeature,
      }, {
        snapFeatures:[feature]
      });
      d.resolve(inputs)
    }).catch((err)=>{
      d.reject(err)
    })
  });
  this.addInteraction(this._interaction);
  return d.promise();
};


proto.stop = function() {
  this.removeInteraction(this._interaction);
  return Promise.resolve();
};

