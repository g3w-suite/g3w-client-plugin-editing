const {G3W_FID} = g3wsdk.constant;
const { base, inherit } =  g3wsdk.core.utils;
const { GUI } = g3wsdk.gui;
const {
  Geometry: {
    removeZValueToOLFeatureGeometry
  }
} = g3wsdk.core.geoutils;
const t = g3wsdk.core.i18n.tPlugin;
const { Feature } = g3wsdk.core.layer.features;
const EditingTask = require('./editingtask');
const SelectCopyFeaturesFormOtherProjectLayerComponent = require('../../../g3w-editing-components/selectcopyotherprojectlayerfeatures');

function CopyFeaturesFromOtherProjectLayerTask(options={}) {
  const {copyLayer, external, isVector} = options;
  this.copyLayer = copyLayer;
  this.external = external;
  this.isVector = isVector;
  base(this, options);
}

inherit(CopyFeaturesFromOtherProjectLayerTask, EditingTask);

const proto = CopyFeaturesFromOtherProjectLayerTask.prototype;


proto.run = function(inputs, context) {
  const d = $.Deferred();
  const {features, layer:originalLayer} = inputs;
  const layerId = originalLayer.getId();
  const attributes = originalLayer.getEditingFields().filter(attribute => !attribute.pk);
  const session = context.session;
  const editingLayer = originalLayer.getEditingLayer();
  const source = editingLayer.getSource();
  const selectedFeatures = [];
  const vueInstance = SelectCopyFeaturesFormOtherProjectLayerComponent({
    external: this.external,
    layer: this.copyLayer,
    features,
    selectedFeatures
  });
  const message = vueInstance.$mount().$el;
  const dialog = GUI.showModalDialog({
    title: t('editing.modal.tools.copyfeaturefromprojectlayer.title'),
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
          if (selectedFeatures.length) {
            const selectedFeature = selectedFeatures[0];
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
            };
            // case vector layer
            if (this.isVector) {
              if (this.external)
                createFeatureWithPropertiesOfSelectedFeature(selectedFeature.getProperties());
              else {
                try {
                  const layerProjectFeature = await this.getEditingService().getProjectLayerFeatureById({
                    layerId: this.copyLayer.getId(),
                    fid: selectedFeature.get(G3W_FID)
                  });
                  if (layerProjectFeature)
                    createFeatureWithPropertiesOfSelectedFeature(layerProjectFeature.properties);
                } catch(err){}
              }
            } else {
              //TODO case alphanumeric layer
            }
          }
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

module.exports = CopyFeaturesFromOtherProjectLayerTask;
