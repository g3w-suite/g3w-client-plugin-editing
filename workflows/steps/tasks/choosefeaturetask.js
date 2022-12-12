const { base, inherit } =  g3wsdk.core.utils;
const { GUI } = g3wsdk.gui;
const t = g3wsdk.core.i18n.tPlugin;
const EditingTask = require('./editingtask');
const ChooseFeatureToEditComponent = require('../../../g3w-editing-components/choosefeaturetoedit');

function CopyFeaturesFromOtherLayerTask(options={}) {
  base(this, options);
}

inherit(CopyFeaturesFromOtherLayerTask, EditingTask);

const proto = CopyFeaturesFromOtherLayerTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const features = inputs.features;
  const attributes = {};
  originalLayer.getEditingFields().forEach(({name, label}) => {
    attributes[name] = label
  });
  if (features.length === 1) d.resolve(inputs);
  else {
    const feature = [];
    const vueInstance = ChooseFeatureToEditComponent({
      features,
      feature,
      attributes
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
            inputs.features = feature;
            d.resolve(inputs)
          }
        }
      }
    });
    dialog.find('button.btn-success').prop('disabled', true);
    vueInstance.$watch('feature', feature => dialog.find('button.btn-success').prop('disabled', feature === null));
  }
  return d.promise();
};

proto.stop = function() {
  return true;
};

module.exports = CopyFeaturesFromOtherLayerTask;
