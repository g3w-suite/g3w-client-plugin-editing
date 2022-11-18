const { base, inherit } =  g3wsdk.core.utils;
const { GUI } = g3wsdk.gui;
const t = g3wsdk.core.i18n.tPlugin;
const { Feature } = g3wsdk.core.layer.features;
const EditingTask = require('./editingtask');
const SelectCopyFeaturesFormOtherProjectLayerComponent = require('../../../g3w-editing-components/selectcopyotherprojectlayerfeatures');

function CopyFeaturesFromOtherLayerTask(options={}) {
  base(this, options);
}

inherit(CopyFeaturesFromOtherLayerTask, EditingTask);

const proto = CopyFeaturesFromOtherLayerTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const {features, layer:originalLayer} = inputs;
  const layerId = originalLayer.getId();
  const attributes = originalLayer.getEditingFields();
  const session = context.session;
  const editingLayer = originalLayer.getEditingLayer();
  const source = editingLayer.getSource();
  const selectedFeatures = [];
  const vueInstance = SelectCopyFeaturesFormOtherProjectLayerComponent({
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
        callback: () => {
          const features = [];
          let isThereEmptyFieldRequiredNotDefined = false;
          selectedFeatures.forEach(selectedFeature => {
            attributes.forEach(({name, validate: {required=false}}) => {
              const value = selectedFeature.get(name) || null;
              isThereEmptyFieldRequiredNotDefined = isThereEmptyFieldRequiredNotDefined || (value === null && required);
              selectedFeature.set(name, value );
            });
            const feature = new Feature({
              feature: selectedFeature,
              properties: attributes.map(attribute => attribute.name)
            });
            feature.setTemporaryId();
            source.addFeature(feature);
            features.push(feature);
            session.pushAdd(layerId, feature, false);
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
