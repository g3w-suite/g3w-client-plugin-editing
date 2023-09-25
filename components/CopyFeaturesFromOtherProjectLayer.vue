<template>
  <div class="editing-layers-features">
    <div
      class = "copy-features-for-layer-content"
      style = "overflow-x: auto"
    >

      <div
        v-for = "(feature, index) in features"
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
              :id     = "`${layerId}_${index}_select_feature_from_layer`"
              :value  = "feature"
              name    = "radio"
              type    = "radio"
              v-model = "selectfeature"
              class   = "magic-radio"
            >
            <label
              :for  = "`${layerId}_${index}_select_feature_from_layer`"
              style = "color: #FFF"
            >{{ index }}</label>
          </div>
        </div>

        <div
          v-for = "({ attribute, value }) in getAttributesFeature(feature)"
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
        features: this.$options.features,
        selectfeature: null,
        selectedFeatures: this.$options.selectedFeatures,
      };
    },

    methods: {

      getAttributesFeature(feature) {
        const { fields } = this.$options;
        const props      = getAlphanumericPropertiesFromFeature(feature.getProperties());
        return props
          .filter(prop => prop !== G3W_FID)
          .map(attr => ({
            attribute: fields ? fields.find(f => f.name === attr).label : attr,
            value:     feature.get(attr),
          }));
      },

      getLayerTitle(layerId) {
        return MapLayersStoreRegistry.getLayerById(layerId).getTitle();
      },

      zoomToFeature(feature) {
        const map =  GUI.getService('map');
        map.seSelectionLayerVisible(false);
        map.zoomToFeatures([feature] , { highlight: true, duration: 1000 }).then(() => map.seSelectionLayerVisible(true))
      },

    },

    watch: {

      selectfeature(feature) {
        this.selectedFeatures.splice(0,1,feature);
      },

    },

  };
</script>
