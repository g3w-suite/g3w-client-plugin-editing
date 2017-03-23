var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.PluginService;

function EditingService() {
  var options = {};
  base(this, options);
  // funzione che crea la configurazione necessaria all'editing dei layers
  this.createLayersConfig = function(layers) {
    var self = this;
    var layersConfig = {
      layersCode: {},
      layers: {}
    };
    _.forEach(layers, function(layer) {
      layersConfig.layersCode[layer.name] = layer.name;
      self.createLayerConfig(layer);
    });
    return layersConfig;
  };

  //crea la configurazione del singolo layer
  this.createLayerConfig = function(options) {
    options = options || {};
    var name = setOptions.name || 'Layer';
    var geometryType = options.geometrytype;
    var layerConfig;
    switch (geometryType) {
      case 'Point' || 'MultiPoint':
        layerConfig = {
          layer: {
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
          },
          editor: {
            name: null,
            layercode: name,
            tools:[
              {
                title: "Aggiungi elemento",
                tooltype: 'addfeature',
                icon: 'addPoint.png'
              },
              {
                title: "Sposta elemento",
                tooltype: 'movefeature',
                icon: 'movePoint.png'
              },
              {
                title: "Rimuovi elemento",
                tooltype: 'deletefeature',
                icon: 'deletePoint.png'
              },
              {
                title: "Edita attributi",
                tooltype: 'editattributes',
                icon: 'editAttributes.png'
              }
            ]
          }
        };
        break;
      case 'Line' || 'MultiLine':
        layerConfig = {
          layer: {
            layerCode: null,
            vector: null,
            editor: null,
            style: new ol.style.Style({
              stroke: new ol.style.Stroke({
                width: 3,
                color: '#ff7d2d'
              })
            })
          },
          editor: {
            name: "Elementi " + name,
            layercode: name,
            tools:[
              {
                title: "Aggiungi elemento",
                tooltype: 'addfeature',
                icon: 'addLine.png'
              },
              {
                title: "Sposta vertice ",
                tooltype: 'modifyvertex',
                icon: 'moveVertex.png'
              },
              {
                title: "Rimuovi elemento",
                tooltype: 'deletefeature',
                icon: 'deleteLine.png'
              },
              {
                title: "Edita attributi",
                tooltype: 'editattributes',
                icon: 'editAttributes.png'
              }
            ]
          }
        };
        break;
      case 'Polygon' || 'MultiPolygon':
        layerConfig = {
          layer: {
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
          },
          editor: {
            name: name,
            layercode: name,
            tools: [
              {
                title: "Aggiungi elemento",
                tooltype: 'addfeature',
                icon: 'AddPolygon.png'
              },
              {
                title: "Sposta elemento",
                tooltype: 'movefeature',
                icon: 'MovePolygon.png'
              },
              {
                title: "Sposta vertice",
                tooltype: 'modifyvertex',
                icon: 'MovePolygonVertex.png'
              },
              {
                title: "Rimuovi elemento",
                tooltype: 'deletefeature',
                icon: 'DeletePolygon.png'
              },
              {
                title: "Edita elemento",
                tooltype: 'editattributes',
                icon: 'editAttributes.png'
              }
            ]
          }
        };
        break;
    }
    return layerConfig;
  }
}  

inherit(EditingService, PluginService);

module.exports = new EditingService;