import {PickFeaturesInteraction} from "../../../interactions/pickfeaturesinteraction";
const { PickCoordinatesInteraction} = g3wsdk.ol.interactions;
const {DataRouterService} = g3wsdk.core.data;
const {ProjectsRegistry} = g3wsdk.core.project;
const { base, inherit }  = g3wsdk.core.utils;
const { GUI } = g3wsdk.gui;
const EditingTask = require('./editingtask');

function PickProjectLayerFeaturesTask(options={}) {
  const {copyLayer, external, isVector} = options;
  this.copyLayer = copyLayer;
  this.external = external;
  this.isVector = isVector;
  this.pickInteraction = null;
  base(this, options);
}

inherit(PickProjectLayerFeaturesTask, EditingTask);

const proto = PickProjectLayerFeaturesTask.prototype;

proto.run = function(inputs, context) {
  return new Promise((resolve, reject) => {
    if (this.copyLayer) {
      this.getFeaturesFromLayer({
        inputs,
        promise: {
          resolve,
          reject
        }
      })
    } else {
      //@TODO  Create a component that ask which project layer would like to query
    }
  })
};

proto.getFeaturesFromLayer = async function({inputs, promise}={}){
  let features = [];
  const geometryType = inputs.layer.getGeometryType();
  const interactionPromise = new Promise(async (resolve, reject) => {
    if (this.isVector) {
      //In case of external layer
      if (this.external) {
        this.pickInteraction = new PickFeaturesInteraction({
          layer: this.copyLayer
        });
        this.addInteraction(this.pickInteraction);
        this.pickInteraction.on('picked', evt => {
          const {features:_features} = evt;
          features = this.convertFeaturesGeometryToGeometryTypeOfLayer({
            features: _features,
            geometryType
           });
          resolve();
        });
      } else {   //In case of TOC/PROJECT layer
        this.pickInteraction = new PickCoordinatesInteraction();
        this.addInteraction(this.pickInteraction);
        const project = ProjectsRegistry.getCurrentProject();
        this.pickInteraction.once('picked', async evt => {
          const coordinates = evt.coordinate;
          try {
            const {data=[]} = await DataRouterService.getData('query:coordinates', {
              inputs: {
                coordinates,
                query_point_tolerance: project.getQueryPointTolerance(),
                layerIds: [this.copyLayer.getId()],
                multilayers: false
              },
              outputs: null
            });
            if (data.length) {
              features = this.convertFeaturesGeometryToGeometryTypeOfLayer({
                features: data[0].features,
                geometryType
              });
            }
          } catch(error) {
            promise.reject(error);
          } finally {
            resolve();
          }
        })
      }
    } else {
      //TO DO NO VECTOR LAYER
    }
  });
  await interactionPromise;
  if (features.length) {
    inputs.features = features;
    promise.resolve(inputs);
  } else {
    GUI.showUserMessage({
      type: 'warning',
      message: 'plugins.editing.messages.no_feature_selected',
      closable: false,
      autoclose: true
    });
    promise.reject();
  }
};

proto.stop = function() {
  this.removeInteraction(this.pickInteraction);
  this.pickInteraction = null;
  return true;
};

module.exports = PickProjectLayerFeaturesTask;
