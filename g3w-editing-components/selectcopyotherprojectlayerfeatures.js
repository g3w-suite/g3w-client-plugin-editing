import CopyFeatureFromOtherLayersComponent from '../components/CopyFeaturesFromOtherProjectLayer.vue';
const {CatalogLayersStoresRegistry} = g3wsdk.core.catalog;

function SelectFeaturesFromOtherLayersComponent({layer, external, features=[], selectedFeatures=[]}={}){
  const Component = Vue.extend(CopyFeatureFromOtherLayersComponent);
  return new Component({
    features,
    fields: !external ? CatalogLayersStoresRegistry.getLayerById(layer.getId()).getFields() : null,
    selectedFeatures
  })
}

module.exports = SelectFeaturesFromOtherLayersComponent;
