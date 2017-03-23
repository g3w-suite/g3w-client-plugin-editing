var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.PluginService;
var Editor = g3wsdk.core.Editor;
var PluginConfig = require('./pluginconfig');

function EditingService() {
  var options = {};
  base(this, options);
  // funzione che crea la configurazione necessaria all'editing dei layers
  this.createLayersConfig = function(layers) {
    var self = this;
    var layersConfig = {
      layerCodes: {},
      layers: {},
      editorsToolBars: {},
      editorClass : {}
    };
    var layerConfig;
    _.forEach(layers, function(layer) {
      layerConfig = self.createLayerConfig(layer);
      layersConfig.layerCodes[layer.state.origname] = layer.state.origname;
      layersConfig.layers[layer.state.origname] = layerConfig.layer;
      layersConfig.editorsToolBars[layer.state.origname] = layerConfig.editor;
      layersConfig.editorClass[layer.state.origname] = Editor;
    });
    return layersConfig;
  };

  //crea la configurazione del singolo layer
  this.createLayerConfig = function(options) {
    options = options || {};
    var origname = options.state.origname;
    var name = options.state.name;
    var geometryType = options.state.geometrytype;
    var layerConfig;
    switch (geometryType) {
      case 'Point' || 'MultiPoint':
        layerConfig = {
          layer: {
            layerCode: origname,
            vector: null,
            editor: null,
            //definisco lo stile
            style: function () {
              return [
                new ol.style.Style({
                  image: new ol.style.Circle({
                    radius: 5,
                    fill: new ol.style.Fill({
                      color: PluginConfig.Point[0]
                    })
                  })
                })
              ]
            }
          },
          editor: {
            name: "Edita " + name,
            layercode: origname,
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
        PluginConfig.Point.splice(0,1);
        break;
      case 'Line' || 'MultiLine':
        layerConfig = {
          layer: {
            layerCode: origname,
            vector: null,
            editor: null,
            style: new ol.style.Style({
              stroke: new ol.style.Stroke({
                width: 3,
                color: PluginConfig.Line[0]
              })
            })
          },
          editor: {
            name: "Edita " + name,
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
        PluginConfig.Line.splice(0,1);
        break;
      case 'Polygon' || 'MultiPolygon':
        layerConfig = {
          layer: {
            layerCode: origname,
            vector: null,
            editor: null,
            style: new ol.style.Style({
              stroke: new ol.style.Stroke({
                color:  PluginConfig.Polygon[0].stroke,
                width: 3
              }),
              fill: new ol.style.Fill({
                color: PluginConfig.Polygon[0].fill
              })
            })
          },
          editor: {
            name: "Edita " + name,
            layercode: origname,
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
        PluginConfig.Polygon.splice(0,1);
        break;
    }
    return layerConfig;
  }
}  

inherit(EditingService, PluginService);

module.exports = new EditingService;