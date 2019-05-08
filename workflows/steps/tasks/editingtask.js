const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const Task = g3wsdk.core.workflow.Task;
const Feature = g3wsdk.core.layer.features.Feature;

function EditingTask(options = {}) {
  base(this, options);
  this._mapService = GUI.getComponent('map').getService();
  this._measureTooltipElement;
  this._poinOnMapMoveListener;
  this._featureGeometryChangelistener;
  this.addInteraction = function(interaction) {
    this._mapService.addInteraction(interaction);
  };
  this.removeInteraction = function(interaction) {
    this._mapService.removeInteraction(interaction);
  };
  this._editingService = null;
}

inherit(EditingTask, Task);

const proto = EditingTask.prototype;

proto.run = function(inputs, context) {};

proto.stop = function() {};

proto.setEnableEditing = function(bool) {
  const editingService = this.getEditingService();
  editingService.setEnabledEditing(bool);
};

proto.getEditingService = function() {
  if (!this._editingService)
    this._editingService = require('../../../services/editingservice');
  return this._editingService;
};

proto.getBranchLayerSource = function() {
  const editingService = this.getEditingService();
  return editingService.getBranchLayerSource();
};

proto.getLayerSource = function(layerId) {
  const editingService = this.getEditingService();
  return editingService.getToolBoxById(layerId).getEditingLayer().getSource();
};

proto.getMap = function() {
  return this._mapService.getMap();
};

proto.getMandatoryFields = function(layerId) {
  const layer = this.getEditingService().getToolBoxById(layerId).getLayer();
  return layer.getEditingFields(true).map((field) => {
    return field.name
  });
};

proto.isBranchLayer = function(layerId) {
  return this.getEditingService().isBranchLayer(layerId);
};

proto.getChartComponent = function({feature, editing}={}) {
  return this.getEditingService().getChartComponent({
    feature,
    editing
  })
};

proto.getSessionByLayerId = function(layerId) {
  const toolbox = this.getEditingService().getToolBoxById(layerId);
  return toolbox.getSession();
};

proto.losseLayerSetDegree = function({ nodeOptions, branchOptions, options={}}) {
  const field = options.field;
  let feature, branchFeatures, session;
  if (nodeOptions) {
    session = nodeOptions.session;
    feature  = nodeOptions.feature;
    const branchLayerId = this.getEditingService().getBranchLayerId();
    const branchLayer = this.getEditingService().getToolBoxById(branchLayerId).getEditingLayer();
    const map = this._mapService.getMap();
    const coordinates = feature.getGeometry().getCoordinates();
    const pixel = map.getPixelFromCoordinate(coordinates);
    branchFeatures = map.getFeaturesAtPixel(pixel, {
      layerFilter: function(layer) {
        return layer === branchLayer
      }
    });
    if (branchFeatures && branchFeatures.length !== 2) {
      return
    }
  } else if (branchOptions) {
    feature = branchOptions.feature;
    branchFeatures = branchOptions.snapFeatures;
    session = branchOptions.session;
    if (feature.length === 1)
      feature = feature[0];
    else
      return;
  }
  const [featureA, featureB] = branchFeatures;
  const {degree} = this._getDegree({
    featureA,
    featureB
  });
  if (branchOptions) {
    const cloneFeature = feature.clone();
    cloneFeature.set(field, +degree);
    session.pushUpdate(branchOptions.layerId, cloneFeature, feature);
  } else
    feature.set(field, +degree);
};

proto._getDegree = function({featureA, featureB, decimal=2}) {
  const featureACoordinates = featureA.getGeometry().getCoordinates();
  const featureBCoordinates = featureB.getGeometry().getCoordinates();
  const coordinates = {
    start: null,
    middle: null,
    end: null,
  };
  for (let i = 0; i < 2; i++) {
    if (featureACoordinates[i].toString() === featureBCoordinates[0].toString()) {
      coordinates.start = featureACoordinates[i ? 0: 1];
      coordinates.middle = featureBCoordinates[0];
      coordinates.end = featureBCoordinates[1];
      break;
    }
    if (featureACoordinates[i].toString() === featureBCoordinates[1].toString()){
      coordinates.start = featureBCoordinates[0];
      coordinates.middle = featureBCoordinates[1];
      coordinates.end = featureACoordinates[i ? 0: 1];
      break;
    }
  }
  const dx1 = coordinates.middle[0] - coordinates.start[0];
  const dy1 = coordinates.middle[1] - coordinates.start[1];
  let angle1 =  Math.atan2(dy1, dx1) * 180 / Math.PI;
  const dx2 = coordinates.middle[0] - coordinates.end[0];
  const dy2 = coordinates.middle[1] - coordinates.end[1];
  let angle2 = Math.atan2(dy2, dx2) * 180 / Math.PI;
  let degree = Math.abs(angle1 - angle2);
  degree = 180 - (degree > 180 ? 360 - degree : degree);
  degree = degree.toFixed(decimal);
  return {
    degree,
    coordinates: coordinates.middle
  };
};

proto.branchLayerDeleteLosse = function({branchOptions={}, options={}}) {
  const {layerId, session, feature} = branchOptions;
  const losselayer = this.getEditingService().getToolBoxById(layerId).getEditingLayer();
  const branch_id = feature.getId();
  const lossefeatures = losselayer.getSource().getFeatures();
  for (let i = 0; i < lossefeatures.length; i++) {
    const feature = lossefeatures[i];
    if (feature.get('branch') === branch_id || feature.get('branch_id') === branch_id) {
      losselayer.getSource().removeFeature(feature);
      session.pushDelete(layerId, feature);
      break;
    }
  }
};

proto.getSnapBrachFeatures = function({feature}) {
  const snapFeatures = [];
  const featureCoordinates = feature.getGeometry().getCoordinates().flat();
  const branchFeatures = this.getEditingService().getBranchLayerSource().getFeatures();
  for (let i=branchFeatures.length; i--;) {
    const branchFeature = branchFeatures[i];
    if (branchFeature !== feature) {
      const branchFeatureCoordinates = branchFeature.getGeometry().getCoordinates().flat();
      const coordinteSet = new Set(featureCoordinates);
      for (let i = branchFeatureCoordinates.length; i--;) {
        if (!coordinteSet.has(branchFeatureCoordinates[i]))
          coordinteSet.add(branchFeatureCoordinates[i]);
        else {
          snapFeatures.push({
            feature: branchFeature,
            coordinates: [branchFeatureCoordinates[i-1], branchFeatureCoordinates[i]]
          });
          break;
        }
      }
    }
  }
  return snapFeatures
};

proto._registerPointerMoveEvent = function({feature, snapFeatures=[]}) {
  let degree;
  const geometry = feature.getGeometry();
  this._featureGeometryChangelistener = geometry.on('change', (evt) => {
    const geom = evt.target;
    const tooltipCoord = geom.getLastCoordinate();
    const length = Math.round(geometry.getLength() * 100) / 100;
    let output = (length > 1000) ?
      `${(Math.round(length / 1000 * 1000) / 1000)} km`
      : `${(Math.round(length * 100) / 100)} m`;
    if (snapFeatures.length === 1) {
      try {
        degree = this._getDegree({
          featureA:feature,
          featureB: snapFeatures[0]
        });
        output = `<p>Lunghezza: ${output}</p>
                  <p>Angolo: ${degree.degree}°</p>`
      } catch(e) {}
    }

    this._measureTooltipElement.innerHTML = output;
    this._measureTooltip.setPosition(tooltipCoord);
  });
};

proto._clearMeasureTooltip = function() {
  this._measureTooltipElement = null;
  ol.Observable.unByKey(this._featureGeometryChangelistener);
  this._featureGeometryChangelistener = null;
  this.getMap().removeOverlay(this._measureTooltip);
  this._measureTooltip = null;
};
/**
 * Creates a new measure tooltip
 */
proto._createMeasureTooltip = function() {
  const map = this.getMap();
  if (this._measureTooltipElement) {
    this._measureTooltipElement.parentNode.removeChild(this._measureTooltipElement);
  }
  if (this._measureTooltip) {
    map.removeOverlay(this._measureTooltip);
  }
  this._measureTooltipElement = document.createElement('div');
  this._measureTooltipElement.className = 'mtooltip mtooltip-measure';
  this._measureTooltip = new ol.Overlay({
    element: this._measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  map.addOverlay(this._measureTooltip);
};

proto.getLosseByCoordinates = function(coordinates) {
  console.log(coordinates)
};

proto.branchLayerAddLosse = function({branchOptions={}, options={}}) {
  const field = options.fields[0];
  const {layerId, session, feature, snapFeatures=[]} = branchOptions;
  const toolbox = this.getEditingService().getToolBoxById(layerId);
  const source = toolbox.getEditingLayer().getSource();
  const layer =  toolbox.getLayer();
  const pk = layer.getPk();
  const branch_id = feature.getId();
  snapFeatures.forEach((snapFeature) => {
    if (snapFeature) {
      const {degree, coordinates} = this._getDegree({
        featureA: feature,
        featureB: snapFeature
      });
      const geometry = new ol.geom.Point(coordinates);
      const lossfeature = new Feature({
        feature: new ol.Feature({
          geometry,
        }),
        pk
      });
      layer.isPkEditable() ?  lossfeature.setNew() : lossfeature.setTemporaryId();
      lossfeature.set(field, degree);

      this.setFeatureBranchId({
        feature: lossfeature,
        branch_id
      });
      source.addFeature(lossfeature);
      lossfeature.setNew();
      session.pushAdd(layerId, lossfeature);
    }
  })
};

proto.getBranchLayerId = function() {
  return this.getEditingService().getBranchLayerId();
};

proto.setFeatureBranchId = function({feature, branch_id}) {
  this.getEditingService().setFeatureBranchId({
    feature,
    branch_id
  })
};

proto.updateFeatureBranchId = function({feature, branchIds}) {
  const oldFeatureBranchId = feature.get('branch_id') || feature.get('branch');
  const newFeatureBrachId = branchIds[oldFeatureBranchId];
  this.setFeatureBranchId({
    feature,
    branch_id: newFeatureBrachId
  })
};

proto.setBranchProfileData = function({feature}) {
  this.getEditingService().getProfileData({feature}).then((response) => {
    if (response.result) {
      const profile = JSON.parse(response.profile);
      for (let i = profile.length; i--; ) {
        profile[i][4] = feature.get('pipe_section_default');
      }
      feature.set('pipes', profile);
    }
  });
};

proto.runNodeMethods = function({type, layerId, feature}) {
  const actions = this.getEditingService().getNodeLayerAction(layerId);
  if (actions && actions[type]){
    const methods = actions[type].methods;
    for (let method in methods) {
      this[method]({
        nodeOptions: {
          feature
        },
        options: methods[method]
      })
    }
  }
};

proto.getLosseByCoordinatesBeforeRunBranchMethods = function({coordinates, action}) {
  const layerIds = this.getEditingService().getBranchLayerAction(action);
  let lossfeature;
  for (let layerId in layerIds) {
    const lossesFeatures = this.getEditingService()
      .getToolBoxById(layerId)
      .getEditingLayer()
      .getSource()
      .getFeatures();
    for (let i = lossesFeatures.length; i--;) {
      const feature = lossesFeatures[i];
      const featureCoordinates = feature.getGeometry().getCoordinates().slice(0,2);
      const coordinatesSet = new Set([...coordinates, ...featureCoordinates]);
      if (coordinatesSet.size < 4 ) {
        lossfeature = {
          layerId,
          feature
        };
        break;
      }
    }
  }
  return lossfeature;
};

proto.runBranchMethods = function({action, session, feature}, options={}) {
  const layerIds = this.getEditingService().getBranchLayerAction(action);
  for (let layerId in layerIds) {
    const config = layerIds[layerId];
    const methods = config.methods;
    feature = feature instanceof Feature ? feature : feature.filter( obj => {
      return obj.layerId === layerId
    }).map(obj => {
      return obj.feature
    });
    for (let method in methods) {
      this[method]({
        options: methods[method],
        branchOptions: {
          layerId,
          session,
          feature,
          ...options
        }
      })
    }

  }
};

proto.createSnapInteraction = function({dependency=[]}) {
  const dependencyFeatures = this.getDependencyFeatures(dependency);
  return new ol.interaction.Snap({
    features: new ol.Collection(dependencyFeatures)
  });
};

proto.getDependencyFeatures = function(dependency) {
  return dependency.flatMap((_dependency) => _dependency.getSource().getFeatures());
};

proto.setBranchId = function({feature, dependency}) {
  const map = this._mapService.getMap();
  let branch_feature;
  const branch_layer = dependency[0];
  const coordinate = feature.getGeometry().getCoordinates();
  const pixel = map.getPixelFromCoordinate(coordinate);
  const branch_features = map.getFeaturesAtPixel(pixel, {
      layerFilter: function(layer) {
        return branch_layer === layer
      }
  });
  if (branch_features.length === 1)
    branch_feature = branch_features[0];
  else {
    for (i = 0; i < branch_features.length; i++) {
      branch_feature = branch_features[i];
      branch_feature_coordinate = branch_feature.getGeometry().getCoordinates();
      if (coordinate.toString() === branch_feature_coordinate[1].toString())
        break;
    }
  }
  this.setFeatureBranchId({
    feature,
    branch_id: branch_feature.getId()
  });
};

proto.removeFromOrphanNodes = function({layerId, id}) {
  const orphannodes = this.getEditingService().getOrphanNodesById({
    layerId,
    id
  });
  const filterednodes = orphannodes.filter((node) => {
    return node.getId() !== id;
  });
  this.getEditingService().setOrphanNodes({
    layerId,
    nodes: filterednodes
  });
};

proto.checkOrphanNodes = function() {
  this.getEditingService().checkOrphanNodes();
};

module.exports = EditingTask;
