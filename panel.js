var base = g3wsdk.core.utils.base;
var inherit = g3wsdk.core.utils.inherit;
var EditingComponent = g3wsdk.gui.vue.EditingComponent;
var PluginConfig = require('./pluginconfig');


function EditingComponent(options) {
  var options = options || {};
  // editortoolsbars
  options.editorsToolBars = [
    {
      name: null,
      layercode: PluginConfig.layerCodes.ACCESSI,
      tools:[
        {
          title: "Aggiungi punto",
          tooltype: 'addfeature',
          icon: 'iternetAddPoint.png'
        },
        {
          title: "Sposta accesso",
          tooltype: 'movefeature',
          icon: 'iternetMovePoint.png'
        },
        {
          title: "Rimuovi accesso",
          tooltype: 'deletefeature',
          icon: 'iternetDeletePoint.png'
        },
        {
          title: "Edita attributi",
          tooltype: 'editattributes',
          icon: 'editAttributes.png'
        }
      ]
    },
    {
      name: "Giunzioni stradali",
      layercode: PluginConfig.layerCodes.GIUNZIONI,
      tools:[
        {
          title: "Aggiungi giunzione",
          tooltype: 'addfeature',
          icon: 'iternetAddPoint.png'
        },
        {
          title: "Sposta giunzione",
          tooltype: 'movefeature',
          icon: 'iternetMovePoint.png'
        },
        {
          title: "Rimuovi giunzione",
          tooltype: 'deletefeature',
          icon: 'iternetDeletePoint.png'
        },
        {
          title: "Edita attributi",
          tooltype: 'editattributes',
          icon: 'editAttributes.png'
        }
      ]
    },
    {
      name: "Elementi stradali",
      layercode: PluginConfig.layerCodes.STRADE,
      tools:[
        {
          title: "Aggiungi linea",
          tooltype: 'addfeature',
          icon: 'iternetAddLine.png'
        },
        {
          title: "Sposta vertice strada",
          tooltype: 'modifyvertex',
          icon: 'iternetMoveVertex.png'
        },
        {
          title: "Taglia su giunzione",
          tooltype: 'cutline',
          icon: 'iternetCutOnVertex.png'
        },
        {
          title: "Rimuovi strada",
          tooltype: 'deletefeature',
          icon: 'iternetDeleteLine.png'
        },
        {
          title: "Edita attributi",
          tooltype: 'editattributes',
          icon: 'editAttributes.png'
        }
      ]
    }
  ];
  options.id = "editing-panel";
  options.name = "Gestione dati EDITING";
  options.serviceOptions = {
    layerCodes: PluginConfig.layerCodes,
    layers: PluginConfig.layers,
    editorClass: PluginConfig.editorClass,
    formClass: PluginConfig.FormClass
  };
  
  base(this, options)
}

inherit(InternetEditingComponent, EditingComponent);

module.exports = InternetEditingComponent;
