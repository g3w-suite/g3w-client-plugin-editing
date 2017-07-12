var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.plugin.PluginService;
var CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
var PluginConfig = require('./pluginconfig');
var Session = g3wsdk.core.editing.Session;

function EditingService() {

  var self = this;
  var options = {};
  base(this, options);
  this._session = null;
  this._vectorLayers = [];
  // prendo tutti i layers del progetto corrente che si trovano sul
  // CATALOGO quelli naturalmente editabili
  this.layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
}

inherit(EditingService, PluginService);

var proto = EditingService.prototype;

proto.init = function(config) {
  // vado a settare l'url di editing aggiungendo l'id del
  // progetto essendo editing api generale
  //config.baseurl = config.baseurl + this.project.getId() + '/';
  this.config = config;
  //temporaneo giusto per ottenere il vettoriale del layer
  // per poter eseguire l'editing
  _.forEach(this.layers, function(layer) {
    // vado a chiamare la funzione che mi permette di
    // estrarre la versione vettoriale del layer di partenza
    self._vectorLayers.push(layer.getLayerForEditing());
  });
  // inizializzo la sessione
  this._session = new Session();
  console.log(this._session);
};

proto.createLayersConfig = function() {
  var self = this;
  //DATA TOGLIERE IN QUANTO LA SELEZIONE DEI LAYER PREVISTI IN EDITING È STATA GIÀ
  //FATTA FILTRANDO QUELLI EDITABILI DAL CATALOAGLAYERSSTOREREGISTRY

  // //vado a prelevare i layer name del plugin
  //var pluginLayers = [];
  // _.forEach(this.config.layers, function(value, name) {
  //   pluginLayers.push(name);
  // });

  // filtro i layers del progetto con quelli del plugin
  // this.layers = _.filter(this.layers, function(layer) {
  //   return pluginLayers.indexOf(layer.getId()) > -1;
  // });

  // creo la struttura per poter inzializzare il pannello dell'editing
  var layersConfig = {
    layerCodes: {},
    layers: {},
    editorsToolBars: {},
    editorClass : {}
  };
  var layerConfig;
  // ciclo su tutti i layers che sono editabili estratti dal catalogLayersstore
  _.forEach(this.layers, function(layer) {
    /*layerConfig = self.createLayerConfig(layer);
    layersConfig.layerCodes[layer.state.id] = layer.state.id;
    layersConfig.layers[layer.state.id] = layerConfig.layer;
    layersConfig.editorsToolBars[layer.state.id] = layerConfig.editor;
    layersConfig.editorClass[layer.state.id] = Editor;*/
  });
  return layersConfig;
};

//crea la configurazione del singolo layer
proto.createLayerConfig = function(layer) {
  var id = layer.getId();
  var name = layer.getName();
  var geometryType = layer.getGeometryType();
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

//funzione che server per aggiungere un editor
proto.addEditor = function(editor) {
  var editorControl = EditorControlFactory.build(editor);
  this._editorsControls.push(editorControl);
};

proto.getEditorsControls = function() {
  return this._editorsControls;
};

proto._cancelOrSave = function(){
  return resolve();
};

proto._stopEditing = function(){

};

proto.stop = function() {
  this._stopEditing();
};

module.exports = new EditingService;