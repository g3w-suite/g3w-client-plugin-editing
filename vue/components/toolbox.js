var ToolComponent = require('./tool');
var editingEventsBus = require('../editingeventbus');

var ToolboxComponent = Vue.extend({
  template: require('./toolbox.html'),
  props: ['state', 'resourcesurl'],
  data: function() {
    return {}
  },
  components: {
    'tool': ToolComponent
  },
  methods: {
    select: function() {
      if (!this.isLayerReady())
        return;
      if (!this.state.selected) {
        editingEventsBus.$emit('setselectedtoolbox', this.state.id);
      }
    },
    toggleEditing: function() {
      //se il toolbox non è ancora abilitato non faccio niente
      if (!this.state.layerstate.editing.ready)
        return;
      this.state.editing.on ? editingEventsBus.$emit('stoptoolbox', this.state.id): editingEventsBus.$emit('starttoolbox', this.state.id);
    },
    saveEdits: function() {
      editingEventsBus.$emit('savetoolbox', this.state.id);
    },
    // funzione che visualizza il toolbox appena sono disponibili le configurazioni
    // fields (passato dal metodo perchè in grado di ricevere parametri)
    isLayerReady: function() {
      return this.state.layerstate.editing.ready;
    },
    stopActiveTool:function() {
      editingEventsBus.$emit('stopactivetool', this.state.id);
    },
    setActiveTool: function(toolId) {
      editingEventsBus.$emit('setactivetool', toolId, this.state.id);
    }
  },
  computed: {
    father: function() {
      return this.state.editing.father && !!this.state.editing.dependencies.length;
    }
  },
  watch: {
    'state.activetool': function (newVal, oldVal) {
      if (newVal)
        // vado a chiedere di fare il commit delle modifiche
        editingEventsBus.$emit('checkdirtytoolboxes', this.state.id);
    }
  }
});

module.exports = ToolboxComponent;


