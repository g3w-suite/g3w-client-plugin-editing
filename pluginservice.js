var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.PluginService;

function EditingService() {
  var options = {};
  base(this, options);
  this.createLayerConfig = function(options) {
    options = options || {};
    var name = setOptions.name || 'Layer';
    var geometryType = options.geometrytype;
    var layer;
    switch (geometryType) {
      case 'Point':
        layer = {
          layerCode: name,
          vector: null,
          editor: null,
          //definisco lo stile
          style: function () {
            var color = '#d9b581';
            return [
              new ol.style.Style({
                image: new ol.style.Circle({
                  radius: 5,
                  fill: new ol.style.Fill({
                    color: color
                  })
                })
              })
            ]
          }
        };
        break;
      case 'Line':
        layer = {
          layerCode: null,
          vector: null,
          editor: null,
          style: new ol.style.Style({
            stroke: new ol.style.Stroke({
              width: 3,
              color: '#ff7d2d'
            })
          })
        };
        break;
      case 'Polygon':
        layer = {
          layerCode: null,
          vector: null,
          editor: null,
          style: new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: 'blue',
              width: 3
            }),
            fill: new ol.style.Fill({
              color: 'rgba(0, 0, 255, 0.1)'
            })
          })
        };
        break;
    }
    return layer;
  }
}  

inherit(EditingService, PluginService);

module.exports = new EditingService;