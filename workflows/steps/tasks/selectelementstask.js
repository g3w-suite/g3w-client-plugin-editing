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
  this._layer = inputs.layer;
  this._layerId = this._layer.getId();
  const d = $.Deferred();
  let featuresSelected = [];
  const styles = {
    'Polygon': new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: [255, 255, 0, 1],
        width: 3
      })
    }),
    'MultiPolygon': new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: [255, 255, 0, 1],
        width: 3
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
      inputs.features = this._selectedFeaturesLayer.getSource().getFeatures();
      this.setUserMessageStepDone('copy');
      this._bboxSelection.setActive(false);

      this._snapIteraction = new ol.interaction.Snap({
        features: new ol.Collection(inputs.features),
        edge: false
      });
      this._drawIteraction = new ol.interaction.Draw({
        type: 'Point',
        features: new ol.Collection(),
      });
      this._drawIteraction.on('drawend', (evt)=> {
        const coordinates = evt.feature.getGeometry().getCoordinates();
        d.resolve({
          inputs,
          context,
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
    this._selectedFeaturesLayer.getSource().clear();
    const bboxExtent = this._bboxSelection.getGeometry().getExtent();
    const layerSource = this._layer.getEditingLayer().getSource();
    const features = layerSource.getFeaturesInExtent(bboxExtent);
    if (!features.length)
      d.reject();
    else {
      this._selectedFeaturesLayer.getSource().addFeatures(features);
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
