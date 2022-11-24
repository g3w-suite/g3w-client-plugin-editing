const { PickCoordinatesInteraction } = g3wsdk.ol.interactions;
const {DataRouterService} = g3wsdk.core.data;
const {ProjectsRegistry} = g3wsdk.core.project;
const { Geometry } = g3wsdk.core.geometry;
const {
  convertSingleMultiGeometry,
  isSameBaseGeometryType
} = g3wsdk.core.geoutils;
const { base, inherit }  = g3wsdk.core.utils;
const { GUI } = g3wsdk.gui;
const EditingTask = require('./editingtask');

function PickProjectLayerFeaturesTask(options={}) {
  this.projectLayer = options.projectLayer;
  this.pickInteraction = null;
  base(this, options);
}

inherit(PickProjectLayerFeaturesTask, EditingTask);

const proto = PickProjectLayerFeaturesTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  if (this.projectLayer) {
    this.getFeaturesFromLayer({
      inputs,
      promise: d
    })
  } else {
    //TO DO  Create a component that ask wich project layer would like to query
  }
  return d.promise()
};

proto.getFeaturesFromLayer = function({inputs, promise}={}){
  if (this.projectLayer.isGeoLayer()) {
    const project = ProjectsRegistry.getCurrentProject();
    const geometryType = this.projectLayer.getGeometryType();
    this.pickInteraction = new PickCoordinatesInteraction();
    this.addInteraction(this.pickInteraction);
    this.pickInteraction.once('picked', async evt => {
      const coordinates = evt.coordinate;
      let features = [];
      try {
        const {data=[]} = await DataRouterService.getData('query:coordinates', {
          inputs: {
            coordinates,
            query_point_tolerance: project.getQueryPointTolerance(),
            layerIds: [this.projectLayer.getId()],
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
        return;
      }
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
    })
  } else {
    //TO DO
  }
};

proto.stop = function() {
  this.removeInteraction(this.pickInteraction);
  this.pickInteraction = null;
  return true;
};

module.exports = PickProjectLayerFeaturesTask;
