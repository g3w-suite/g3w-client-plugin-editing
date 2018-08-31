const GUI = g3wsdk.gui.GUI;
const RelationsComponentObj = require('./components/relations/vue/relations');
const EdtingFormService = function(options) {
  const EditingService = require('../services/editingservice');
  options = options || {};
  this.state = {
    relations: []
  };
  // riceve il context del form principale
  this._context = options.context || {};
  // riceve gli inpust del form principale
  this._inputs = options.inputs || {};
  // riceve l'event bus del form pricipale
  this._formEventBus = options.formEventBus || null;
  // sono le relazioni effettive presenti
  let relations = [];
  const formLayer = this._context.layer;
  const formFeature = this._inputs.features[this._inputs.features.length - 1];
  if (formLayer.isFather()) {
    // recupero l'array delle relazioni
    relations = formLayer.getRelations().getArray();
    // vado a filtrare le relazioni per quelle che son o effettivamente in editing
    relations = EditingService.getRelationsInEditing(relations, formFeature, formFeature.isNew());
    // le relazioni in questione sono oggetti Realtion che contengono le informazioni nello stato delle composizione della relazione
  }

  this.hasRelations = function() {
    return !!relations.length;
  };

  // funzione che mi serve per costruire il componente vue da innestare dentro il form
  // come componente relations
  this.buildRelationsComponents = function() {
    const self = this;
    return Vue.extend({
      mixins: [RelationsComponentObj],
      methods: {
        getService: function() {
          return self._relationsService;
        }
      },
      data: function() {
        return {
          relations: relations,
          resourcesurl: GUI.getResourcesUrl(),
          formeventbus: self._formEventBus
        }
      }
    })
  };
};

module.exports =  EdtingFormService;
