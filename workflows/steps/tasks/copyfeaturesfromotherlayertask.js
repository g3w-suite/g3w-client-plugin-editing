const { base, inherit } =  g3wsdk.core.utils;
const { GUI } = g3wsdk.gui;
const { Feature } = g3wsdk.core.layer.features;
const EditingTask = require('./editingtask');
const SelectFeaturesDom = require('../../../g3w-editing-components/selectcopyotherlayersfeatures');

function CopyFeaturesFromOtherLayerTask(options={}) {
  base(this, options);
}

inherit(CopyFeaturesFromOtherLayerTask, EditingTask);

const proto = CopyFeaturesFromOtherLayerTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const layerId = originalLayer.getId();
  const attributes = originalLayer.getEditingFields();
  const session = context.session;
  const editingLayer = originalLayer.getEditingLayer();
  const source = editingLayer.getSource();
  const mapService = this.getMapService();
  const selectionLayerSource = mapService.defaultsLayers.selectionLayer.getSource();
  const features = selectionLayerSource.getFeatures().filter(feature => feature.__layerId !== layerId);
  const selectedFeatures = [];
  const message = SelectFeaturesDom({
    features,
    selectedFeatures
  });
  GUI.showModalDialog({
    title: 'Seleziona feature/s',
    className: 'modal-left',
    closeButton: false,
    message,
    buttons: {
      cancel: {
        label: 'Cancel',
        className: 'btn-default',
        callback(){
          d.reject();
        }
      },
      ok: {
        label: 'Ok',
        className: 'btn-primary',
        callback: () => {
          selectedFeatures.forEach(selectedFeature => {
            attributes.forEach(({name}) => {
              selectedFeature.set(name, selectedFeature.get(name) || null);
            });
            const feature = new Feature({
              feature: selectedFeature,
            });
            feature.setTemporaryId();
            source.addFeature(feature);
            session.pushAdd(layerId, feature, false);
            inputs.features.push(feature);
            this.fireEvent('addfeature', feature)
          });
          d.resolve(inputs)
        }
      }
    }
  });
  return d.promise();
};


proto.stop = function() {
  return true;
};



module.exports = CopyFeaturesFromOtherLayerTask;
