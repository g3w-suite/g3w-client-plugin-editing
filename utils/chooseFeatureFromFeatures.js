import ChooseFeatureToEditVueComponent from '../components/ChooseFeatureToEdit.vue';

const { tPlugin: t }  = g3wsdk.core.i18n;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @since g3w-client-plugin-editing@v3.5.13
 */
export function chooseFeatureFromFeatures({
  features = [],
  inputs
}) {
  return new Promise((resolve, reject) => {

    const feature = [];

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/choosefeaturetoedit.js@v3.6
     */
    const comp = new (Vue.extend(ChooseFeatureToEditVueComponent))({
      features:   Array.isArray(features) ? features : [],
      feature,
      attributes: inputs.layer.getEditingFields().map(({ name, label }) => ({ name, label })),
    });

    const message = comp.$mount().$el;

    const dialog = g3wsdk.gui.GUI.showModalDialog({
      title: t('editing.modal.tools.copyfeaturefromprojectlayer.title'),
      className: 'modal-left',
      closeButton: false,
      message,
      buttons: {
        cancel: {
          label: 'Cancel',
          className: 'btn-danger',
          callback() {
            reject();
          }
        },
        ok: {
          label: 'Ok',
          className: 'btn-success',
          callback: () => {
            resolve(feature[0])
          }
        }
      }
    });
    dialog.find('button.btn-success').prop('disabled', true);
    comp.$watch('feature', feature => dialog.find('button.btn-success').prop('disabled', feature === null));
  })
};