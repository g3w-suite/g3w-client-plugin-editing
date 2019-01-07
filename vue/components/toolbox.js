const ToolComponent = require('./tool');

const ToolboxComponent = Vue.extend({
  template: require('./toolbox.html'),
  props: ['state', 'resourcesurl'],
  data: function() {
    return {
      active: false
    }
  },
  components: {
    'tool': ToolComponent,
  },
  methods: {
    select: function() {
      if (!this.isLayerReady)
        return;
      if (!this.state.selected) {
        this.$emit('setselectedtoolbox', this.state.id);
      }
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
    isLayerReady() {
      return this.state.layerstate.editing.ready;
    }
  }
});

module.exports = ToolboxComponent;


