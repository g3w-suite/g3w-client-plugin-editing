const {base, inherit}  = g3wsdk.core.utils;
const { GUI } = g3wsdk.gui;
const {t, tPlugin} = g3wsdk.core.i18n;
const EditingTask = require('./editingtask');

const Dialogs = {
  delete: {
    fnc: function(inputs) {
      return new Promise((resolve, reject) => {
        const EditingService = require('../../../services/editingservice');
        const layer = inputs.layer;
        const editingLayer = layer.getEditingLayer();
        const feature = inputs.features[0];
        const layerId = layer.getId();
        const childRelations = layer.getChildren();
        const relationinediting = childRelations.length &&  EditingService._filterRelationsInEditing({
          layerId,
          relations: layer.getRelations().getArray()
        }).length > 0;

        GUI.dialog.confirm(`<h4>${tPlugin('editing.messages.delete_feature')}</h4>
                        <div style="font-size:1.2em;">${ relationinediting ?tPlugin('editing.messages.delete_feature_relations') : ''}</div>`, result => {
          if (result) {
            editingLayer.getSource().removeFeature(feature);
            EditingService.removeLayerUniqueFieldValuesFromFeature({
              layerId,
              feature
            });
            resolve(inputs)
          }  else reject(inputs);
        });
      })
    }
  },
  commit: {
    fnc(inputs) {
      return new Promise((resolve, reject) => {
        let close = inputs.close;
        const buttons = {
          SAVE: {
            label: t("save"),
            className: "btn-success",
            callback() {
              resolve(inputs);
            }
          },
          CANCEL: {
            label: close ? t("exitnosave") : t("annul"),
            className: "btn-danger",
            callback() {
              reject();
            }
          }
        };
        if (close) {
          buttons.CLOSEMODAL = {
            label:  t("annul"),
            className: "btn-primary",
            callback() {
              dialog.modal('hide');
            }
          }
        }
        // NOW I HAVE TO IMPLEMENT WHAT HAPPEND ID NO ACTION HAPPEND
        const dialog = GUI.dialog.dialog({
          message: inputs.message,
          title: tPlugin("editing.messages.commit_feature") + " " +inputs.layer.getName() + "?",
          buttons
        });
      })
    }
  }
};

function ConfirmTask(options = {}) {
  const type = options.type || "default";
  this._dialog = Dialogs[type];
  base(this, options);
}

inherit(ConfirmTask, EditingTask);

const proto = ConfirmTask.prototype;

proto.run = function(inputs, context) {
  const promise = this._dialog.fnc(inputs, context);
  inputs.features && this.setAndUnsetSelectedFeaturesStyle({
    promise
  });
  return promise;
};

proto.stop = function() {
  return true;
};

module.exports = ConfirmTask;
