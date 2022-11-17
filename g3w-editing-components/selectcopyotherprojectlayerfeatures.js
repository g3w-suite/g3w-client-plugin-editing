import CopyFeatureFromOtherLayersComponent from '../components/CopyFeaturesFromOtherProjectLayer.vue';

function SelectFeaturesFromOtherLayersComponent({features=[], selectedFeatures=[]}={}){
  const Component = Vue.extend(CopyFeatureFromOtherLayersComponent);
  return new Component({
    features,
    selectedFeatures
  })
}

module.exports = SelectFeaturesFromOtherLayersComponent;
