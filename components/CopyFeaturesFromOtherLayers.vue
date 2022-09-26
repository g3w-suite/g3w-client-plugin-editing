<template>
    <div class="editing-layers-features">
        <div v-for="([layerId, features]) in Object.entries($options.layers)">
          <div class="skin-color" style="font-weight: bold; font-size: 1.2em;">{{ getLayerTitle(layerId) }}</div>
          <divider></divider>
          <div v-for="(feature, index) in features" style="padding: 5px; position: relative; display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eeeeee; ">
            <input @click.stop="selectFeature(feature)" :id="`${layerId}_${index}_select_feature_from_layer`" type="checkbox" class="magic-checkbox">
            <label :for="`${layerId}_${index}_select_feature_from_layer`"> {{ feature.getId() }} </label>
            <div @click.stop="zoomToFeature(feature)" :class="g3wtemplate.font['marker']" class="skin-color" style="padding: 3px; font-size: 1.1em;  cursor: pointer; margin-right: 5px;"></div>
          </div>
        </div>
    </div>
</template>

<script>
  const { GUI } = g3wsdk.gui;
  const {MapLayersStoreRegistry} = g3wsdk.core.map;

  export default {
    name: 'Copyfeaturesfromotherlayers',
    data(){
      return {
        selectedFeatures: this.$options.selectedFeatures
      }
    },
    methods: {
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
        }).then(()=>mapService.seSelectionLayerVisible(true))
      }
    },
    mounted(){
      GUI.closeContent();
    }
  };
</script>
