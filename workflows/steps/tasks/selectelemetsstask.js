const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function SelectElementsTask(options={}) {
  this._bboxSelection;
  this._drawInteraction;
  this._snapIteraction;
  base(this, options);
}

inherit(SelectElementsTask, EditingTask);

const proto = SelectElementsTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const layersFeaturesSelected = {};
  const selectionStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: [255, 255, 0, 1],
      width: 3
    }),
    image: new ol.style.Circle({
      radius: 6,
      fill: new ol.style.Fill({
        color: [255, 255, 0, 1]
      }),
      stroke: new ol.style.Stroke({
        color: [255, 255, 255, 1],
        width: 3
      })
    })
  });

  this._selectedFeaturesLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: selectionStyle
  });

  this.getMap().addLayer(this._selectedFeaturesLayer);
  this._ctrlC = (evt) => {
    if ((evt.ctrlKey ||evt.metaKey) && evt.which === 67) {
      this._bboxSelection.setActive(false);
      const branchLayerFeatures = layersFeaturesSelected[this.getBranchLayerId()];
      this._snapIteraction = new ol.interaction.Snap({
        features: new ol.Collection(branchLayerFeatures),
        edge: false
      });
      this._drawIteraction = new ol.interaction.Draw({
        type: 'Point',
        features: new ol.Collection(),
        condition: function(evt) {
          const coordinates = evt.coordinate;
          return !!branchLayerFeatures.find((feature) => {
            const featureCoordinates = feature.getGeometry().getCoordinates();
            return (featureCoordinates[0].toString() === coordinates.toString() || featureCoordinates[1].toString() === coordinates.toString())
          })
        }
      });
      this._drawIteraction.on('drawend', (evt)=> {
        const coordinates = evt.feature.getGeometry().getCoordinates();
        d.resolve({
          layersFeaturesSelected,
          coordinates
        });
      });
      this.addInteraction(this._drawIteraction);
      this.addInteraction(this._snapIteraction);
    }
  };

  this._bboxSelection = new ol.interaction.DragBox();
  this.addInteraction(this._bboxSelection);
  this._bboxSelection.on('boxend', () => {
    const bboxExtent = this._bboxSelection.getGeometry().getExtent();
    const toolboxes = this.getEditingService().getToolBoxes().reverse();
    for (let i = 0; i < toolboxes.length; i++) {
      const toolbox = toolboxes[i];
      const layerId = toolbox.getId();
      const layerSource = toolbox.getEditingLayer().getSource();
      let features = layerSource.getFeaturesInExtent(bboxExtent);
      if (features.length) {
        if (layersFeaturesSelected[layerId]) {
          features = features.filter((feature) => {
            const indexFeature = layersFeaturesSelected[layerId].indexOf(feature);
            if ( indexFeature === -1)
              return true;
            else {
              this._selectedFeaturesLayer.getSource().removeFeature(feature);
              layersFeaturesSelected[layerId].splice(indexFeature,1);
              return false;
            }
          });
          layersFeaturesSelected[layerId] = [...layersFeaturesSelected[layerId], ...features];
        } else {
          layersFeaturesSelected[layerId] = features;
        }
        features.length && this._selectedFeaturesLayer.getSource().addFeatures(features);
      } else {
        if (layersFeaturesSelected[layerId]) {
          layersFeaturesSelected[layerId].forEach((feature) => {
            this._selectedFeaturesLayer.getSource().removeFeature(feature);
          });
          delete layersFeaturesSelected[layerId];
        }
      }
    }

  });
  document.addEventListener('keydown', this._ctrlC);
  return d.promise();
};

proto.stop = function() {
  this.removeInteraction(this._bboxSelection);
  this.removeInteraction(this._drawIteraction);
  this.removeInteraction(this._snapIteraction);
  this._drawInteraction = null;
  this._snapIteraction = null;
  this._bboxSelection = null;
  document.removeEventListener('keydown', this._ctrlC);
  this._ctrlC = null;
  this._selectedFeaturesLayer.getSource().clear();
  this.getMap().removeLayer(this._selectedFeaturesLayer);
  return true;
};



module.exports = SelectElementsTask;
