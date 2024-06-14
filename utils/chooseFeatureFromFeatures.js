const { tPlugin }  = g3wsdk.core.i18n;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/choosefeaturetoedit.js@v3.6
 * 
 * @since g3w-client-plugin-editing@v3.5.13
 */
export function chooseFeatureFromFeatures({
  features = [],
  inputs
}) {
  return new Promise((resolve, reject) => {

    const feature = [];

    const comp = new (Vue.extend(require('../components/ChooseFeatureToEdit.vue')))({
      features:   Array.isArray(features) ? features : [],
      feature,
      attributes: inputs.layer.getEditingFields().map(({ name, label }) => ({ name, label })),
    });

    const dialog = g3wsdk.gui.GUI.showModalDialog({
      title:       tPlugin('editing.modal.tools.copyfeaturefromprojectlayer.title'),
      className:   'modal-left',
      closeButton: false,
      message:     comp.$mount().$el,
      buttons: {
        cancel: { label: 'Cancel', className: 'btn-danger',  callback() { reject();           } },
        ok:     { label: 'Ok',     className: 'btn-success', callback() { resolve(feature[0]) } }
      }
    });

    dialog.find('button.btn-success').prop('disabled', true);

    comp.$watch('feature', feature => dialog.find('button.btn-success').prop('disabled', null === feature));
  })
};