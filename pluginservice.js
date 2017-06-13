var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.PluginService;
var Editor = g3wsdk.core.Editor;
var PluginRegistry = g3wsdk.core.ProjectsRegistry;
var LayersRegistry = g3wsdk.core.LayersRegistry;
var PluginConfig = require('./pluginconfig');

function EditingService() {

  var options = {};
  base(this, options);
  // vado a prendere il current project
  this.project = PluginRegistry.getCurrentProject();
  // prendo tutti i layers del progetto corrente
  this.layers = LayersRegistry.getLayers();
  // funzione che crea la configurazione necessaria all'editing dei layers
  this.createLayersConfig = function() {
    var self = this;
    var pluginLayers = [];
    //vado a prelevare i layer name del plugin
    _.forEach(this.config.layers, function(value, name) {
      pluginLayers.push(name);
    });
    // filtro i layers del progetto con quelli del plugin
    this.layers = _.filter(this.layers, function(layer) {
      return pluginLayers.indexOf(layer.state.id) > -1;
    });
    // creo la struttura per poter inzializzare il pannello dell'editing
    var layersConfig = {
      layerCodes: {},
      layers: {},
      editorsToolBars: {},
      editorClass : {}
    };
    var layerConfig;
    _.forEach(this.layers, function(layer) {
      layerConfig = self.createLayerConfig(layer);
      layersConfig.layerCodes[layer.state.id] = layer.state.id;
      layersConfig.layers[layer.state.id] = layerConfig.layer;
      layersConfig.editorsToolBars[layer.state.id] = layerConfig.editor;
      layersConfig.editorClass[layer.state.id] = Editor;
    });
    return layersConfig;
  };

  this.init = function(config) {
    // vado a settare l'url di editing aggiungendo l'id del
    // progetto essendo editng api generale
    config.baseurl = config.baseurl + this.project.getId() + '/';
    this.config = config;
  };

  //crea la configurazione del singolo layer
  this.createLayerConfig = function(options) {
    options = options || {};
    var id = options.state.id;
    var name = options.state.name;
    var geometryType = options.state.geometrytype;
    var layerConfig;
    switch (geometryType) {
      case 'Point' || 'MultiPoint':
        layerConfig = {
          layer: {
            layerCode: id,
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
            layercode: id,
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
            layerCode: id,
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
            layercode: id,
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
            layerCode: id,
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
            layercode: id,
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
  };
}  

inherit(EditingService, PluginService);

module.exports = new EditingService;