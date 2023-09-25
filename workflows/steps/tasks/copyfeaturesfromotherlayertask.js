import CopyFeatureFromOtherLayersComponent from '../../../components/CopyFeaturesFromOtherLayers.vue';

const { G3W_FID }                          = g3wsdk.constant;
const { base, inherit }                    = g3wsdk.core.utils;
const {
  Geometry: {
    removeZValueToOLFeatureGeometry
  }
}                                          = g3wsdk.core.geoutils;
const { GUI }                              = g3wsdk.gui;
const t                                    = g3wsdk.core.i18n.tPlugin;
const { Feature }                          = g3wsdk.core.layer.features;
const { CatalogLayersStoresRegistry }      = g3wsdk.core.catalog;

const EditingTask                          = require('./editingtask');

function CopyFeaturesFromOtherLayerTask(options={}) {
  base(this, options);
}

inherit(CopyFeaturesFromOtherLayerTask, EditingTask);

const proto = CopyFeaturesFromOtherLayerTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const geometryType = originalLayer.getGeometryType();
  const layerId = originalLayer.getId();
  const attributes = originalLayer.getEditingFields().filter(attribute => !attribute.pk);
  const session = context.session;
  const editingLayer = originalLayer.getEditingLayer();
  const source = editingLayer.getSource();
  const features = this.getFeaturesFromSelectionFeatures({
    layerId,
    geometryType
  });
  const selectedFeatures = [];

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/selectcopyotherlayersfeatures.js.js@3.6
   */
  const layers = {};
  (features || []).forEach(f => {
    if (undefined === layers[layerId]) {
      const external = !CatalogLayersStoresRegistry.getLayerById(f.__layerId);
      layers[f.__layerId] = {
        external,
        fields: !external && CatalogLayersStoresRegistry.getLayerById(f.__layerId).getFields(),
        features:[]
      };
    }
    layers[layerId].features.push(f);
  });
  const Component = Vue.extend(CopyFeatureFromOtherLayersComponent);
  const vueInstance = new Component({ layers, selectedFeatures });

  const message = vueInstance.$mount().$el;
  const dialog = GUI.showModalDialog({
    title: t('editing.modal.tools.copyfeaturefromotherlayer.title'),
    className: 'modal-left',
    closeButton: false,
    message,
    buttons: {
      cancel: {
        label: 'Cancel',
        className: 'btn-danger',
        callback(){
          d.reject();
        }
      },
      ok: {
        label: 'Ok',
        className: 'btn-success',
        callback: async () => {
          const features = [];
          let isThereEmptyFieldRequiredNotDefined = false;
          const promisesFeatures = [];
          selectedFeatures.forEach(selectedFeature => {
            /**
             * check if layer belong to project or not
             */
            if (this.getEditingService().getProjectLayerById(selectedFeature.__layerId)) {
              promisesFeatures.push(this.getEditingService().getProjectLayerFeatureById({
                layerId: selectedFeature.__layerId,
                fid: selectedFeature.get(G3W_FID)
              }));
            } else {
              promisesFeatures.push({
                properties: selectedFeature.getProperties()
              })
            }
          });
          const featurePromises = await Promise.allSettled(promisesFeatures);
          featurePromises.forEach(({status, value:layerFeature}, index) => {
            if (status === "fulfilled") {
              const selectedFeature = selectedFeatures[index];
              attributes.forEach(({name, validate: {required=false}}) => {
                const value = layerFeature.properties[name] || null;
                isThereEmptyFieldRequiredNotDefined = isThereEmptyFieldRequiredNotDefined || (value === null && required);
                selectedFeature.set(name, value );
              });
              const feature = new Feature({
                feature: selectedFeature,
                properties: attributes.map(attribute => attribute.name)
              });
              originalLayer.getEditingNotEditableFields().find(field => {
                if (originalLayer.isPkField(field)){
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
              session.pushAdd(layerId, feature, false);
            }
          });
          if (features.length && features.length === 1) inputs.features.push(features[0]);
          else {
            isThereEmptyFieldRequiredNotDefined && GUI.showUserMessage({
              type: 'warning',
              message: 'plugins.editing.messages.copy_and_paste_from_other_layer_mandatory_fields',
              autoclose: true,
              duration: 2000
            });
            inputs.features.push(features);
          }
          features.forEach(feature => this.fireEvent('addfeature', feature));
          d.resolve(inputs)
        }
      }
    }
  });
  dialog.find('button.btn-success').prop('disabled', true);
  vueInstance.$watch('selectedFeatures', features => dialog.find('button.btn-success').prop('disabled', features.length === 0));
  return d.promise();
};

proto.stop = function() {
  return true;
};


module.exports = CopyFeaturesFromOtherLayerTask;
