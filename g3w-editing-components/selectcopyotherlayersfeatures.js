import CopyFeatureFromOtherLayersComponent from '../components/CopyFeaturesFromOtherLayers.vue';
const {CatalogLayersStoresRegistry} = g3wsdk.core.catalog;

function SelectFeaturesFromOtherLayersComponent({features=[], selectedFeatures=[]}={}){
  const layers = {};
  features.forEach(feature => {
    const layerId = feature.__layerId;
    if (layers[layerId] === undefined) {
      const external = !CatalogLayersStoresRegistry.getLayerById(layerId);
      layers[layerId] = {
        external,
        fields: !external && CatalogLayersStoresRegistry.getLayerById(layerId).getFields(),
        features:[]
      };
    }
    layers[layerId].features.push(feature);
  });
  const Component = Vue.extend(CopyFeatureFromOtherLayersComponent);
  return new Component({
    layers,
    selectedFeatures
  })
}

module.exports = SelectFeaturesFromOtherLayersComponent;