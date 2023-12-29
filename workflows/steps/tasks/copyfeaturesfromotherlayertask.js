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
  this.openFormTask = options.openFormTask;
  base(this, options);
}

inherit(CopyFeaturesFromOtherLayerTask, EditingTask);

const proto = CopyFeaturesFromOtherLayerTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const geometryType = originalLayer.getGeometryType();
  const layerId = originalLayer.getId();
  //get attributes/properties from current layer in editing
  const attributes = originalLayer
    .getEditingFields()
    .filter(attribute => !attribute.pk);
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
    if (undefined === layers[f.__layerId]) {
      const external = !CatalogLayersStoresRegistry.getLayerById(f.__layerId);
      layers[f.__layerId] = {
        external,
        fields: !external && CatalogLayersStoresRegistry.getLayerById(f.__layerId).getFields(),
        features:[]
      };
    }
    layers[f.__layerId].features.push(f);
  });

  //set reactive
  const editAttributes = Vue.observable({
    state: false
  })
  const Component = Vue.extend(CopyFeatureFromOtherLayersComponent);
  const vueInstance = new Component({
    layers,
    selectedFeatures,
    editAttributes
  });

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
              // Check if there is an empty filed required not defined
              isThereEmptyFieldRequiredNotDefined = undefined !== attributes
                .find(({name, validate: {required=false}}) => {
                  return (undefined === layerFeature.properties[name] && required);
                });

              const feature = new Feature({
                feature: selectedFeature,
                properties: attributes.map(attribute => attribute.name)
              });

              //@TODO check better way
              //Set undefined property to null otherwise on commit
              // property are lost
              attributes.forEach(({name}) => {
                if (undefined === feature.get(name)) {
                  feature.set(name, null);
                }
              })

              originalLayer.getEditingNotEditableFields()
                .find(field => {
                  if (originalLayer.isPkField(field)) {
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
          //check if features selected are more than one
          if (features.length > 1) {
            if (editAttributes.state && this.openFormTask) {
              this.openFormTask.updateMulti(true);
            } else {
              if (isThereEmptyFieldRequiredNotDefined) {
                GUI.showUserMessage({
                  type: 'warning',
                  message: 'plugins.editing.messages.copy_and_paste_from_other_layer_mandatory_fields',
                  autoclose: true,
                  duration: 2000
                });
              }
            }
          }
          features.forEach(feature => {
            inputs.features.push(feature)
            this.fireEvent('addfeature', feature)
          });
          vueInstance.$destroy();
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
