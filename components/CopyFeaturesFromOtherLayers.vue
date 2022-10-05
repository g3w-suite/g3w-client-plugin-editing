<template>
    <div class="editing-layers-features">
        <div v-for="([layerId, features]) in Object.entries($options.layers)">
          <div class="skin-color" style="font-weight: bold; font-size: 1.2em;">{{ getLayerTitle(layerId) }}</div>
          <divider></divider>
          <div class="copy-features-for-layer-content" style="overflow-x: auto">
            <div v-for="(feature, index) in features" style="padding: 5px; position: relative; display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eeeeee;">
              <div style="display: flex; flex-direction: column; border-right: 1px solid #eeeeee">
                <div @click.stop="zoomToFeature(feature)" :class="g3wtemplate.font['marker']" class="skin-color" style="padding: 0 5px 15px 5px; font-size: 1.1em;  cursor: pointer; margin-right: 5px;"></div>
                <div v-t-tooltip:right.create="'plugins.editing.steps.help.select_elements'">
                  <input @click.stop="selectFeature(feature)" :id="`${layerId}_${index}_select_feature_from_layer`" type="checkbox" class="magic-checkbox">
                  <label :for="`${layerId}_${index}_select_feature_from_layer`" style="color: #FFFFFF"> {{ feature.getId() }} </label>
                </div>
              </div>
              <div v-for="({attribute, value}) in getAttributesFeature(feature)" style="display: flex; flex-direction: column; padding: 5px;">
                <span style="font-weight: bold; margin-bottom: 10px;">{{attribute}}</span>
                <span style="align-self: start">{{value}}</span>
              </div>
            </div>
          </div>

        </div>
    </div>
</template>

<script>
  const { GUI } = g3wsdk.gui;
  const {getAlphanumericPropertiesFromFeature} = g3wsdk.core.geoutils;
  const {MapLayersStoreRegistry} = g3wsdk.core.map;

  export default {
    name: 'Copyfeaturesfromotherlayers',
    data(){
      return {
        selectedFeatures: this.$options.selectedFeatures
      }
    },
    methods: {
      getAttributesFeature(feature){
        return getAlphanumericPropertiesFromFeature(feature.getProperties()).map(attribute => ({
          attribute,
          value: feature.get(attribute)
        })).slice(2)
      },
      selectFeature(feature){
        const find = this.selectedFeatures.find(selectedFeature => selectedFeature === feature);
        if (find) this.selectedFeatures = this.selectedFeatures.filter(selectedFeature => selectedFeature !== feature);
        else this.selectedFeatures.push(feature);
      },
      getLayerTitle(layerId){
        return MapLayersStoreRegistry.getLayerById(layerId).getTitle()
      },
      zoomToFeature(feature) {
        const mapService =  GUI.getService('map');
        mapService.seSelectionLayerVisible(false);
        mapService.zoomToFeatures([feature] , {
          highlight: true,
          duration: 1000
        }).then(()=> mapService.seSelectionLayerVisible(true))
      }
    },
    mounted(){
      GUI.closeContent();
    }
  };
</script>
