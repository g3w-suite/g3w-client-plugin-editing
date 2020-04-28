const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const { dissolve } = g3wsdk.core.geoutils;
const EditingTask = require('./editingtask');
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;
const GUI = g3wsdk.gui.GUI;
const SelectFeaturesDom = require('../../../vue/components/selectfeatures/selectfeatures');

function MergeFeaturesTask(options={}){
  base(this, options);
}

inherit(MergeFeaturesTask, EditingTask);

const proto = MergeFeaturesTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
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
    })
  } else {
    const mapService = this.getMapService();
    const message = SelectFeaturesDom({
      features,
      events: {
        click:(index) => {
          const feature = features[index];
          const originalFeature = feature.clone();
          const newFeature = dissolve({
            features,
            index,
          });
          session.pushUpdate(layerId, newFeature, originalFeature);
          features.splice(index, 1);
          features.forEach(deleteFeature => {
            session.pushDelete(layerId, deleteFeature);
            source.removeFeature(deleteFeature);
          })
          inputs.features = [feature];
          d.resolve(inputs);
        },
        mouseover:(index)=>{
          const feature = features[index];
          mapService.highlightGeometry(feature.getGeometry(), {
            zoom: false
          })
        }
      }
    });
    console.log(message)
    GUI.showModalDialog({
      title: 'seleziona la feature',
      message,
      buttons: {
        cancel: {
          label: 'Cancel',
          className: 'btn-default',
          callback: function(){

          }
        },
        ok: {
          label: 'Ok',
          className: 'btn-primary',
          callback: function(){

          }
        }
      }
    })
  }


  return d.promise();
};
proto.stop = function(){
  this.removeInteraction(this._pickInteraction);
};


module.exports = MergeFeaturesTask;
