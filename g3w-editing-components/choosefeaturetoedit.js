import ChooseFeatureToEditVueComponent from '../components/ChooseFeatureToEdit.vue';

function ChooseFeatureToEditComponent({features=[], feature=null, attributes=[]}={}){
  const Component = Vue.extend(ChooseFeatureToEditVueComponent);
  return new Component({
    features,
    feature,
    attributes
  })
}

module.exports = ChooseFeatureToEditComponent;
