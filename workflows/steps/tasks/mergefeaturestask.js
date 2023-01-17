const { base, inherit } = g3wsdk.core.utils;
const { dissolve } = g3wsdk.core.geoutils;
const EditingTask = require('./editingtask');
const { GUI } = g3wsdk.gui;
const SelectFeaturesDom = require('../../../g3w-editing-components/selectmergefeatures');

function MergeFeaturesTask(options={}){
  base(this, options);
}

inherit(MergeFeaturesTask, EditingTask);

const proto = MergeFeaturesTask.prototype;

proto.run = function(inputs, context) {
  return new Promise((resolve, reject) => {
    const { layer, features } = inputs;
    const editingLayer = layer.getEditingLayer();
    const source = editingLayer.getSource();
    const layerId = layer.getId();
    const session = context.session;
    if (features.length < 2) {
      GUI.showUserMessage({
        type: 'warning',
        message: 'Seleziona come minimo due features',
        autoclose: true
      });
      reject();
    } else {
      const mapService = this.getMapService();
      let index;
      const message = SelectFeaturesDom({
        features,
        events: {
          click:(idx) => {
            index = idx;
            const feature = features[index];
            mapService.highlightGeometry(feature.getGeometry(), {
              zoom: false,
              color: 'red'
            })
          },
        }
      });
      GUI.showModalDialog({
        title: 'seleziona la feature',
        className: 'modal-left',
        closeButton: false,
        message,
        buttons: {
          cancel: {
            label: 'Cancel',
            className: 'btn-default',
            callback: function(){
              reject();
            }
          },
          ok: {
            label: 'Ok',
            className: 'btn-primary',
            callback() {
              if (index !== undefined) {
                const feature = features[index];
                const originalFeature = feature.clone();
                const newFeature = dissolve({
                  features,
                  index,
                });
                if (newFeature) {
                  session.pushUpdate(layerId, newFeature, originalFeature);
                  features.splice(index, 1);
                  features.forEach(deleteFeature => {
                    session.pushDelete(layerId, deleteFeature);
                    source.removeFeature(deleteFeature);
                  });
                  inputs.features = [feature];
                  resolve(inputs);
                } else {
                  GUI.showUserMessage({
                    type: 'warning',
                    message: 'No feature disolved',
                    autoclose: true
                  });
                  reject()
                }
              } else {
                GUI.showUserMessage({
                  type: 'warning',
                  message: 'No feature selected',
                  autoclose: true
                });
                reject();
              }
            }
          }
        }
      })
    }
  })
};
proto.stop = function(){
  this.removeInteraction(this._pickInteraction);
};


module.exports = MergeFeaturesTask;
