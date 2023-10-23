<template>
  <div class="editing-layers-features">
    <div
      v-for = "(layerId) in Object.keys($options.layers)"
    >

      <div class="skin-color" style="font-weight: bold; font-size: 1.2em;">{{ getLayerTitle(layerId) }}</div>
  
      <divider />
  
      <div
        class = "copy-features-for-layer-content"
        style = "overflow-x: auto"
      >
        <div
          v-for = "(feature, index) in $options.layers[layerId].features"
          style = "
            padding: 5px;
            position: relative;
            display: flex;
            align-items: baseline;
            border-bottom: 1px solid #eee;
          "
        >

          <div
            style = "
              display: flex;
              flex-direction: column;
              border-right: 1px solid #eee;
            "
          >
            <div
              @click.stop = "zoomToFeature(feature)"
              :class      = "g3wtemplate.font['marker']"
              class       = "skin-color"
              style       = "
                padding: 0 5px 15px 5px;
                font-size: 1.1em;
                cursor: pointer;
                margin-right: 5px;
              "
            ></div>
            <div v-t-tooltip:right.create="'plugins.editing.steps.help.select_elements'">
              <input
                @click.stop = "selectFeature(feature)"
                :id         = "`${layerId}_${index}_select_feature_from_layer`"
                type        = "checkbox"
                class       = "magic-checkbox"
              >
              <label
                :for  = "`${layerId}_${index}_select_feature_from_layer`"
                style = "color: #FFF"> {{ feature.getId() || 0 }}
              </label>
            </div>
          </div>

          <div
            v-for = "({ attribute, value }) in getAttributesFeature(feature, layerId)"
            style = "
              display: flex;
              flex-direction: column;
              padding: 10px;
            "
          >
            <span style="font-weight: bold; margin-bottom: 10px;">{{ attribute }}</span>
            <span style="align-self: start">{{ value }}</span>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script>
  const { G3W_FID }                              = g3wsdk.constant;
  const { GUI }                                  = g3wsdk.gui;
  const { getAlphanumericPropertiesFromFeature } = g3wsdk.core.geoutils;
  const { MapLayersStoreRegistry }               = g3wsdk.core.map;

  export default {

    name: 'Copyfeaturesfromotherlayers',

    data() {
      return {
        selectedFeatures: this.$options.selectedFeatures,
      };
    },

    methods: {

      getAttributesFeature(feature, layerId) {
        const { external, fields } = this.$options.layers[layerId];
        const props                = getAlphanumericPropertiesFromFeature(feature.getProperties());
        return props
          .filter(prop => prop !== G3W_FID)
          .map(attr => ({
            attribute: (external ? attr : fields.find(f => f.name === attr).label),
            value: feature.get(attr),
          }));
      },

      selectFeature(feature) {
        const selected = this.selectedFeatures.find(f => f === feature);
        if (selected) {
          this.selectedFeatures = this.selectedFeatures.filter(f => f !== feature);
        } else {
          this.selectedFeatures.push(feature);
        }
      },

      getLayerTitle(layerId) {
        const layer = MapLayersStoreRegistry.getLayerById(layerId);
        return layer ? layer.getTitle() : GUI.getService('map').getLayerById(layerId).get('name');
      },

      zoomToFeature(feature) {
        const map =  GUI.getService('map');
        map.zoomToFeatures([feature] , { highlight: true, duration: 1000 });
      },

    },

    mounted() {
      GUI.closeContent();
    },

  };
</script>
