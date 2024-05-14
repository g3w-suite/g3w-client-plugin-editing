<template>
  <div class="editing-layers-features">
    <div class="copy-features-for-layer-content">

      <div v-for="(feature, index) in features">

        <div class="col-1">
          <div
            @click.stop = "zoomToFeature(feature)"
            :class      = "g3wtemplate.font['marker']"
            class       = "ztf skin-color"
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

        <div class="feature-attributes" v-for="({ attribute, value }) in getAttributesFeature(feature)" >
          <span class="f-attr">{{ attribute }}</span>
          <span class="f-value">{{ value }}</span>
        </div>

      </div>

    </div>
  </div>
</template>

<script>
  import { getProjectLayerFeatureById } from '../utils/getProjectLayerFeatureById';

  const { CatalogLayersStoresRegistry }          = g3wsdk.core.catalog;
  const { G3W_FID }                              = g3wsdk.constant;
  const { getAlphanumericPropertiesFromFeature } = g3wsdk.core.geoutils;
  const { removeZValueToOLFeatureGeometry }      = g3wsdk.core.geoutils.Geometry;
  const { tPlugin }                              = g3wsdk.core.i18n;
  const { Feature }                              = g3wsdk.core.layer.features;
  const { MapLayersStoreRegistry }               = g3wsdk.core.map;
  const { GUI }                                  = g3wsdk.gui;

  export default {

    name: 'Copyfeaturesfromotherlayers',

    data() {
      return {
        features:         this.$options.inputs.features || [],
        selectfeature:    null,
        selectedFeatures: this.$options.selectedFeatures || [],
        inputs:           this.$options.inputs,
        context:          this.$options.context,
        promise:          this.$options.promise,
        copyLayer:        this.$options.copyLayer,
        external:         this.$options.external,
        isVector:         this.$options.isVector,
      };
    },

    methods: {

      getAttributesFeature(feature) {
        const fields = this.$options.external
          ? null
          : CatalogLayersStoresRegistry.getLayerById(this.$options.copyLayer.getId()).getFields();

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
        map.zoomToFeatures([feature] , { highlight: true, duration: 1000 });
      },

    },

    watch: {

      selectfeature(feature) {
        this.selectedFeatures.splice(0,1,feature);
      },

      selectedFeatures(features) {
        this.dialog.find('button.btn-success').prop('disabled', features.length === 0)
      }

    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/selectcopyotherprojectlayerfeatures.js.js@v3.6
     */
    async mounted() {
      console.log(this);
      const inputs           = this.$options.inputs;
      const context          = this.$options.context;
      const d                = this.$options.promise;
      const copyLayer        = this.$options.copyLayer;
      const external         = this.$options.external;
      const isVector         = this.$options.isVector;
      const layerId          = inputs.layer.getId();
      const attributes       = inputs.layer.getEditingFields().filter(attribute => !attribute.pk);
      const source           = inputs.layer.getEditingLayer().getSource();

      this.dialog = GUI.showModalDialog({
        title: tPlugin('editing.modal.tools.copyfeaturefromprojectlayer.title'),
        className: 'modal-left',
        closeButton: false,
        message: this.$el,
        buttons: {
          cancel: {
            label: 'Cancel',
            className: 'btn-danger',
            callback(){d.reject();}
          },
          ok: {
            label: 'Ok',
            className: 'btn-success',
            callback: async () => {
              const features = [];
              let isThereEmptyFieldRequiredNotDefined = false;
              if (this.selectedFeatures.length) {
                const selectedFeature = this.selectedFeatures[0];
                const createFeatureWithPropertiesOfSelectedFeature = properties => {
                  attributes.forEach(({name, validate: {required=false}}) => {
                    const value = properties[name] || null;
                    isThereEmptyFieldRequiredNotDefined = isThereEmptyFieldRequiredNotDefined || (value === null && required);
                    selectedFeature.set(name, value);
                  });
                  const feature = new Feature({
                    feature: selectedFeature,
                    properties: attributes.map(attribute => attribute.name)
                  });

                  inputs.layer
                    .getEditingNotEditableFields()
                    .find(field => {
                      if (inputs.layer.isPkField(field)){
                        feature.set(field, null)
                      }
                    });
                  //remove eventually Z Values
                  removeZValueToOLFeatureGeometry({
                    feature
                  });
                  feature.setTemporaryId();
                  source.addFeature(feature);
                  features.push(feature);
                  context.session.pushAdd(layerId, feature, false);
                };
                // case vector layer
                if (isVector) {
                  if (external) {
                    createFeatureWithPropertiesOfSelectedFeature(selectedFeature.getProperties());
                  } else {
                    try {
                      const layerProjectFeature = await getProjectLayerFeatureById({
                        layerId: copyLayer.getId(),
                        fid: selectedFeature.get(G3W_FID)
                      });
                      if (layerProjectFeature) {
                        createFeatureWithPropertiesOfSelectedFeature(layerProjectFeature.properties);
                      }
                    } catch(err) {
                      console.warn(err);
                    }
                  }
                } else {
                  //TODO case alphanumeric layer
                }
              }
              if (features.length && features.length === 1) {
                inputs.features.push(features[0]);
              } else {
                if (isThereEmptyFieldRequiredNotDefined) {
                  GUI.showUserMessage({
                    type: 'warning',
                    message: 'plugins.editing.messages.copy_and_paste_from_other_layer_mandatory_fields',
                    autoclose: true,
                    duration: 2000
                  });
                }
                inputs.features.push(features);
              }
              features.forEach(feature => this.service.fireEvent('addfeature', feature));
              d.resolve(inputs)
            }
          }
        }
      });
      this.dialog.find('button.btn-success').prop('disabled', true);
    },

  };
</script>


<style scoped>
.copy-features-for-layer-content {
  overflow-x: auto;
}
.copy-features-for-layer-content > div {
  padding: 5px;
  position: relative;
  display: flex;
  align-items: baseline;
  border-bottom: 1px solid #eee;
}
.copy-features-for-layer-content .col-1 {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #eee;
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
  align-self: start
}
.copy-features-for-layer-content .ztf {
  padding: 0 5px 15px 5px;
  font-size: 1.1em;
  cursor: pointer;
  margin-right: 5px;
}
</style>