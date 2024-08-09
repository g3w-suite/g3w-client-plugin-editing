<template>
  <div class = "editing-layers-features" >

    <!-- EDIT MULTI FEATURE ATTRIBUTES  -->
    <div
      v-if        = "showEditAttributes"
      v-disabled  = "disabled"
      class       = "edit-multi-features"
    >
      <input
        id          = "g3w_edit_attributes_of_select_feature_from_layer"
        type        = "checkbox"
        class       = "magic-checkbox"
        v-model     = "$options.editAttributes.state"
      />
      <label
        for        = "g3w_edit_attributes_of_select_feature_from_layer"
        v-t-plugin = "'editing.modal.tools.copyfeaturefromotherlayer.edit_attributes'">
      </label>
    </div>

    <section
      class  = "g3w-editing-other-layers-features"
      :style = "{height: `${$data._height}px`}"
    >
      <div v-for =" (layerId) in Object.keys($options.layers)">

        <div class = "layer-title skin-color">{{ getLayerTitle(layerId) }}</div>

        <divider />

          <div class = "copy-features-for-layer-content">
            <div
              v-for = "(feature, index) in $options.layers[layerId].features"
              class = "GIVE_ME_A_NAME_1"
            >

              <div class = "GIVE_ME_A_NAME_2">

                <!-- ZOOM TO FEATURE -->
                <div
                  @click.stop = "zoomToFeature(feature)"
                  :class      = "['ztf', 'skin-color', g3wtemplate.font['marker']]"
                ></div>

                <!-- SELECT FEATURE -->
                <div v-t-tooltip:right.create = "'plugins.editing.steps.help.select_elements'">
                  <input
                    @click.stop = "selectFeature(feature)"
                    :id         = "`${layerId}_${index}_select_feature_from_layer`"
                    type        = "checkbox"
                    class       = "magic-checkbox"
                  />
                  <label :for = "`${layerId}_${index}_select_feature_from_layer`"> {{ feature.getId() || 0 }}</label>
                </div>

              </div>

              <div
                v-for = "({ attribute, value }) in getAttributesFeature(feature, layerId)"
                class = "feature-attributes"
              >
                <span class = "f-attr">{{ attribute }}</span>
                <span class = "f-value">{{ value }}</span>
              </div>

            </div>
          </div>

        </div>
    </section>

  </div>
</template>

<script>
  const { G3W_FID }                              = g3wsdk.constant;
  const { GUI }                                  = g3wsdk.gui;
  const { getAlphanumericPropertiesFromFeature } = g3wsdk.core.geoutils;
  const { MapLayersStoreRegistry }               = g3wsdk.core.map;
  const { resizeMixin }                          = g3wsdk.gui.vue.Mixins;

  export default {

    name: 'Copyfeaturesfromotherlayers',

    mixins: [resizeMixin],

    data() {
      return {
        selectedFeatures: this.$options.selectedFeatures,
        disabled:         true, //@since v3.7 check if we want to edit multi selected feature attributes
        _height:          0,
      };
    },

    computed: {
      /**
       * Show edit attributes only if there are at least 2 feature to select
       * @since v3.7
       */
      showEditAttributes() {
        return Object.values(this.$options.layers).reduce((sum, { features }) => {
          sum = sum + features.length;
          return sum;
        }, 0) > 1;
      }
    },

    methods: {
      async resize() {
        await this.$nextTick();
        this.$data._height = window.innerHeight - 200;
      },
      getAttributesFeature(feature, layerId) {
        const { external, fields } = this.$options.layers[layerId];
        const props                = getAlphanumericPropertiesFromFeature(feature.getProperties());
        return props
          .filter(prop => G3W_FID !== prop)
          .map(attr => ({
            attribute: (external ? attr : fields.find(f => f.name === attr).label),
            value:     feature.get(attr),
          }));
      },

      selectFeature(feature) {
        if (this.selectedFeatures.find(f => feature === f)) {
          this.selectedFeatures = this.selectedFeatures.filter(f => feature !== f);
        } else {
          this.selectedFeatures.push(feature);
        }
        this.disabled = this.selectedFeatures.length < 2;
        this.$options.editAttributes.state = !this.disabled && this.$options.editAttributes.state;
      },

      getLayerTitle(layerId) {
        const layer = MapLayersStoreRegistry.getLayerById(layerId);
        return layer ? layer.getTitle() : GUI.getService('map').getLayerById(layerId).get('name');
      },

      zoomToFeature(feature) {
        GUI.getService('map').zoomToFeatures([feature] , { highlight: true, duration: 1000 });
      },

    },

    beforeCreate() {
      this.delayType = 'debounce';
    },

    mounted() {
      GUI.closeContent();
    },

  };
</script>

<style scoped>
  .g3w-editing-other-layers-features {
    overflow: auto;
  }
  .edit-multi-features {
    display: flex;
    justify-content: flex-end
  }
  .edit-multi-features > label {
    color: #000;
  }
  .layer-title {
    font-weight: bold;
    font-size: 1.2em;
  }
  .copy-features-for-layer-content {
    overflow-x: auto;
  }
  .ztf {
    padding: 0 5px 15px 5px;
    font-size: 1.1em;
    cursor: pointer;
    margin-right: 5px;
  }
  .GIVE_ME_A_NAME_1 {
    padding: 5px;
    position: relative;
    display: flex;
    align-items: baseline;
    border-bottom: 1px solid #eee;
  }
  .GIVE_ME_A_NAME_2 {
    display: flex;
    flex-direction: column;
    border-right: 1px solid #eee;
  }
  .GIVE_ME_A_NAME_2 .magic-checkbox + label {
    color: #FFF;
  }
  .feature-attributes {
    display: flex;
    flex-direction: column;
    padding: 10px;
  }
  .f-attr {
    font-weight: bold;
    margin-bottom: 10px;
  }
  .f-value {
    align-self: start;
  }
</style>
