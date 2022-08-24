import CopyFeatureFromOtherLayersComponent from '../components/CopyFeaturesFromOtherLayers.vue';

function SelectFeaturesDom({features=[], selectedFeatures=[]}={}){
  const layers = {};
  features.forEach(feature => {
    const layerId = feature.__layerId;
    if (layers[layerId] === undefined) layers[layerId] = [];
    layers[layerId].push(feature);
  });
  const Component = Vue.extend(CopyFeatureFromOtherLayersComponent);
  return new Component({
    layers,
    selectedFeatures
  }).$mount().$el;
}

module.exports = SelectFeaturesDom;
