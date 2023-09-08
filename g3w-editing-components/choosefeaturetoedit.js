import ChooseFeatureToEditVueComponent from '../components/ChooseFeatureToEdit.vue';

/**
 *
 * @param features
 * @param feature
 * @param attributes
 * @returns Vue component
 * @constructor
 */
function ChooseFeatureToEditComponent({features=[], feature=null, attributes=[]}={}){
  const Component = Vue.extend(ChooseFeatureToEditVueComponent);
  return new Component({
    features,
    feature,
    attributes
  })
}

module.exports = ChooseFeatureToEditComponent;
