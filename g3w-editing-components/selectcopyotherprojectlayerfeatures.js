import CopyFeatureFromOtherLayersComponent from '../components/CopyFeaturesFromOtherProjectLayer.vue';
const {CatalogLayersStoresRegistry} = g3wsdk.core.catalog;

/**
 *
 * @param layer
 * @param external
 * @param features
 * @param selectedFeatures
 * @returns Vue Component
 * @constructor
 */
function SelectFeaturesFromOtherLayersComponent({layer, external, features=[], selectedFeatures=[]}={}){
  const Component = Vue.extend(CopyFeatureFromOtherLayersComponent);
  return new Component({
    features,
    fields: external ? null: CatalogLayersStoresRegistry.getLayerById(layer.getId()).getFields(),
    selectedFeatures
  })
}

module.exports = SelectFeaturesFromOtherLayersComponent;
