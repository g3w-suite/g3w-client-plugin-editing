var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var merge =  g3wsdk.core.utils.merge;
var GUI = g3wsdk.gui.GUI;
var Component = g3wsdk.gui.vue.Component;
var EditingService = require('../editingservice');
var EditingTemplate = require('./editing.html');
var ToolboxComponent = require('./components/toolbox');

//il bus events per la gestione del pannello di editing
var editingeventsbus = new Vue();

var vueComponentOptions = {
  template: EditingTemplate,
  data: null,
  components: {
    'toolbox': ToolboxComponent //componenti
  },
  transitions: {'addremovetransition': 'showhide'},
  methods: {
    onClose: function() {
    },
    undo: function() {
      var session = this.state.toolboxSelected.getSession();
      var relationsChanges = session.undo(); // questi solo le feature (cambiamenti) che devo applicare al features stores dei singoli layers coinvolti
      //this.$options.service.applyChangesDependencies(session.getId(), dependenciesChanges);
    },
    redo: function() {
      var session = this.state.toolboxSelected.getSession();
      var relationsChanges = session.redo();
      //this.$options.service.applyChangesDependencies(session.getId(), dependenciesChanges);
    },
    commit: function() {
      // funzione che serve a fare il commit della sessione legata al tool
      // qui probabilmente a seconda del layer se ha dipendenze faccio ogni sessione
      // produrrà i suoi dati post serializzati che pi saranno uniti per un unico commit
      this.state.toolboxSelected.getSession().commit();
    },
    saveAll: function() {
      //TODO dovrebbe igessere legata alla possibilità di salvare tutte le modifiche di tutti i layer
    },
    setSelectedToolbox: function(toolbox) {
      if(this.state.toolboxSelected) {
        this.state.toolboxSelected.setSelected(false);
      }
      toolbox.setSelected(true);
      this.state.toolboxSelected = toolbox;
    }
  },
  computed: {
    canCommit: function() {
      var toolbox = this.state.toolboxSelected;
      return !_.isNull(toolbox) && toolbox.getSession().getHistory().canCommit();
    },
    canUndo: function() {
      var toolbox = this.state.toolboxSelected;
      return !_.isNull(toolbox) &&  toolbox.getSession().getHistory().canUndo();
    },
    canRedo: function() {
      var toolbox = this.state.toolboxSelected;
      return !_.isNull(toolbox) && toolbox.getSession().getHistory().canRedo();
    },
    // messaggio generale dell'editing esempio comunicando che il layer
    // che stiamo editindo è padre e quindi i figli sono disabilitati
    message: function() {
      var message = "";
      return message;
    }
  },
  mounted: function() {
    var self = this;
    editingeventsbus.$on('select:toolbox', function(toolbox) {
      self.setSelectedToolbox(toolbox);
    })
  }
};

function PanelComponent(options) {
  var self = this;
  // proprietà necessarie. In futuro le mettermo in una classe Panel
  // da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  base(this, options);
  // qui vado a tenere traccia delle due cose che mi permettono di customizzare
  // vue component e service
  this.vueComponent = vueComponentOptions;
  this.name = options.name || 'Gestione dati';
  merge(this, options);
  // contiene tuti gli editor Controls che a loro volta contengono i tasks per l'editing
  // di quello specifico layer
  this._toolboxes = options.toolboxes || [];
   // save buttons
  this._labels = {
    start: "Avvia modifica",
    stop: "Disattiva modifica",
    save: "Salve"
  };
  this._saveBtnLabel = options.saveBtnLabel || "Salva";
  // resource urls
  this._resourcesUrl = options.resourcesUrl || GUI.getResourcesUrl();
  this._service = options.service || EditingService;
  // setto il componente interno
  var InternalComponent = Vue.extend(this.vueComponent);
  this.internalComponent = new InternalComponent({
    service: this._service,
    data: function() {
      return {
        //lo state è quello del servizio in quanto è lui che va a modificare operare sui dati
        state: {
          toolboxes: self._toolboxes,
          labels: self._labels,
          toolboxSelected: null
        },
        resourcesurl: self._resourcesUrl,
        editingeventsbus: editingeventsbus
      }
    }
  });

  // sovrascrivo richiamando il padre in append
  this.mount = function(parent) {
    return base(this, 'mount', parent, true)
  };

  this.unmount = function() {
    // faccio in modo che venga disattivato l'eventuale tool attivo al momento del
    // click sulla x
    this._service.stop();
    return base(this, 'unmount');
  };
}

inherit(PanelComponent, Component);

module.exports = PanelComponent;


