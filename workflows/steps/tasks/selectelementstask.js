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
  const styles = {
    'LineString': new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: [255, 255, 0, 1],
        width: 3
      })
    }),
    'Point': new ol.style.Style({
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: [255, 255, 0, 1]
        })
      })
    })
  };

  const selectionStyleFnc = function(feature) {
    return styles[feature.getGeometry().getType()]
  };

  this._selectedFeaturesLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: selectionStyleFnc
  });

  this._ctrlC = (evt) => {
    if ((evt.ctrlKey ||evt.metaKey) && evt.which === 67) {
      if (!this._selectedFeaturesLayer.getSource().getFeatures().length) return;
      this.setUserMessageStepDone('copy');
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
        this.setUserMessageStepDone('from')
      });
      this.addInteraction(this._drawIteraction);
      this.addInteraction(this._snapIteraction);
    }
  };

  this._bboxSelection = new ol.interaction.DragBox({
    condition: ol.events.condition.shiftKeyOnly
  });

  this.addInteraction(this._bboxSelection);

  this._bboxSelection.on('boxend', () => {
    let selectedFeatures = 0;
    this._selectedFeaturesLayer.getSource().clear();
    const bboxExtent = this._bboxSelection.getGeometry().getExtent();
    const toolboxes = this.getEditingService().getToolBoxes();
    for (let i  = toolboxes.length; i--;) {
      const toolbox = toolboxes[i];
      const layerId = toolbox.getId();
      const layerSource = toolbox.getEditingLayer().getSource();
      let features = layerSource.getFeaturesInExtent(bboxExtent);
      layersFeaturesSelected[layerId] = features;
      for( let i = features.length; i--; ) {
        const feature = features[i].clone();
        this._selectedFeaturesLayer.getSource().addFeature(feature);
        selectedFeatures+=1;
      }
    }
    if (selectedFeatures === 0)
      d.reject();
    else {
      this.setUserMessageStepDone('select');
      document.addEventListener('keydown', this._ctrlC);
    }

  });
  this.getMap().addLayer(this._selectedFeaturesLayer);
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
  this.getMap().removeLayer(this._selectedFeaturesLayer);
  this._selectedFeaturesLayer.getSource().clear();
  this._selectedFeaturesLayer = null;
  return true;
};

module.exports = SelectElementsTask;
