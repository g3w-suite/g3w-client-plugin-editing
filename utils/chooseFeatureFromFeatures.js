import ChooseFeatureToEditVueComponent from '../components/ChooseFeatureToEdit.vue';

const { tPlugin: t }  = g3wsdk.core.i18n;


/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
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
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/choosefeaturetoedit.js@3.6
     */
    const Component    = Vue.extend(ChooseFeatureToEditVueComponent);
    const vueInstance  = new Component({
      features:   Array.isArray(features) ? features : [],
      feature,
      attributes: inputs.layer.getEditingFields().map(({ name, label }) => ({ name, label })),
    });

    const message = vueInstance.$mount().$el;

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
    vueInstance.$watch('feature', feature => dialog.find('button.btn-success').prop('disabled', feature === null));
  })
};