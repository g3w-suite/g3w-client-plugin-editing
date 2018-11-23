const ToolComponent = require('./tool');
const ToolsOfToolComponent = require('./toolsoftool');

const ToolboxComponent = Vue.extend({
  template: require('./toolbox.html'),
  props: ['state', 'resourcesurl'],
  data: function() {
    return {
      active: false,
      showtoolsoftool: true
    }
  },
  components: {
    'tool': ToolComponent,
    'toolsoftool': ToolsOfToolComponent
  },
  methods: {
    select: function() {
      if (!this.isLayerReady)
        return;
      if (!this.state.selected) {
        this.$emit('setselectedtoolbox', this.state.id);
      }
    },
    toggleEditing() {
      //se il toolbox non è ancora abilitato non faccio niente
      if (!this.state.layerstate.editing.ready || this.state.loading)
        return;
      this.state.editing.on ? this.$emit('stoptoolbox', this.state.id): this.$emit('starttoolbox', this.state.id);
    },
    saveEdits() {
      this.$emit('savetoolbox', this.state.id);
    },
    stopActiveTool() {
      this.$emit('stopactivetool', this.state.id);
    },
    setActiveTool(toolId) {
      this.$emit('setactivetool', toolId, this.state.id);
    }
  },
  computed: {
    father: function() {
      return this.state.editing.father && !!this.state.editing.dependencies.length;
    },
    toolhelpmessage() {
      return this.state.toolmessages.help;
    },
    showtoolsoftool() {
      return !!this.state.toolsoftool.length;
    },
    isLayerReady() {
      return this.state.layerstate.editing.ready;
    }
  }
});

module.exports = ToolboxComponent;


