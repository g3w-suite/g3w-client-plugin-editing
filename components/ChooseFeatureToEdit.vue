<template>
    <div id="editing-layers-choose-feature">
      <div
        v-for="(feature, index) in $options.features"
        class="editing-choose-feature-radio-input">

        <section class="choose-and-zoom-to-feature">
          <div>
            <input
              :id="`choose_feature_${index}`"
              @click.stop="selectFeature(feature)"
              name="radio"
              type="radio"
              class="magic-radio">
            <label
              :for="`choose_feature_${index}`"
              style="color: transparent">id
            </label>
          </div>
          <div
            @click.stop="zoomToFeature(feature)"
            :class="g3wtemplate.font['marker']"
            class="skin-color" style="padding-left: 3px; font-size: 1.3em; cursor: pointer; margin-top: 10px;">
          </div>
        </section>

        <section
          style="overflow-x: auto; display: flex">
          <div
            v-for="({attribute, value}) in getAttributesFeature(feature)"
            style="display: flex; flex-direction: column; justify-content: space-between;  padding: 5px;">

            <span style="font-weight: bold; margin-bottom: 10px;">
              {{attribute}}
            </span>

            <span
              style="align-self: start; white-space: nowrap;">{{value}}
            </span>

          </div>

        </section>
      </div>
    </div>
</template>

<script>
  const {G3W_FID} = g3wsdk.constant;
  const {GUI} = g3wsdk.gui;
  const {getAlphanumericPropertiesFromFeature} = g3wsdk.core.geoutils;

  export default {
    name: 'choosefeature',
    data() {
      return {
        feature: this.$options.feature
      }
    },
    methods: {
      selectFeature(feature){
        this.feature.splice(0);
        this.feature.push(feature);
      },
      getAttributesFeature(feature) {
        const properties = feature.getProperties();
        return this.$options.attributes.map(({label, name}) => ({
          attribute: label,
          value: properties[name]
        }))
      },
      zoomToFeature(feature) {
        const mapService = GUI.getService('map');
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
  .choose-and-zoom-to-feature{
   display: flex;
   flex-direction: column;
   justify-content: space-between;
  }

  #editing-layers-choose-feature .editing-choose-feature-radio-input{
    align-items: center;
    padding: 5px;
    position: relative;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #eeeeee;
  }
</style>
