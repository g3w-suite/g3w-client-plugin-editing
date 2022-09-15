<template>
    <div id="editing-layers-choose-feature">
      <div class="editing-choose-feature-radio-input" v-for="(feature, index) in $options.features">
        <input @click.stop="selectFeature(feature)" :id="`choose_feature_${index}`" name="radio" type="radio" class="magic-radio">
        <label :for="`choose_feature_${index}`">{{ feature.get($options.attributes[0]) }}</label>
        <template v-for="attribute in $options.attributes.slice(1,3)">
          <div style="font-weight: bold; width: 100px; text-overflow: ellipsis;white-space: nowrap;overflow: hidden;"> {{ feature.get(attribute)}}</div>
        </template>
        <div @click.stop="zoomToFeature(feature)" :class="g3wtemplate.font['marker']" class="skin-color" style="padding: 3px; font-size: 1.1em;  cursor: pointer; margin-right: 5px;"></div>
      </div>
    </div>
</template>

<script>
  const { GUI } = g3wsdk.gui;
  const {MapLayersStoreRegistry} = g3wsdk.core.map;

  export default {
    name: 'choosefeature',
    data(){
      return {
        feature: this.$options.feature
      }
    },
    methods: {
      selectFeature(feature){
        this.feature.splice(0);
        this.feature.push(feature);
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
<style scoped>
  #editing-layers-choose-feature .editing-choose-feature-radio-input{
    padding: 5px;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid #eeeeee;
  }
</style>
