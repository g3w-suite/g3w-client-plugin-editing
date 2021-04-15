const ApplicationState = g3wsdk.core.ApplicationState;
const ToolComponent = require('./tool');
const ToolsOfToolComponent = require('./toolsoftool');
const t = g3wsdk.core.i18n.tPlugin;
const compiledTemplate = Vue.compile(require('./toolbox.html'));

const ToolboxComponent = Vue.extend({
  ...compiledTemplate,
  props: ['state', 'resourcesurl'],
  data: function() {
    return {
      active: false
    }
  },
  components: {
    'tool': ToolComponent,
    'toolsoftool': ToolsOfToolComponent
  },
  methods: {
    select: function() {
      if (!this.isLayerReady) return;
      if (!this.state.selected) this.$emit('setselectedtoolbox', this.state.id);
    },
    toggleEditing() {
      this.select();
      if (!this.state.layerstate.editing.ready || this.state.loading) return;
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
    toolsrow1(){
      return this.state.tools.filter(tool => tool.row === 1);
    },
    toolsrow2(){
      return this.state.tools.filter(tool => tool.row === 2);
    },
    toolsrow3(){
      return this.state.tools.filter(tool => tool.row === 3);
    },
    canEdit() {
      return this.state.editing.canEdit;
    },
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
  },
  created() {
    this.edit_layer_tooltip = 'editing.tooltip.edit_layer';
    this.$emit('canEdit', {
      id: this.state.id
    });
    // to transalte help message
    this.$watch(()=> ApplicationState.lng, ()=>{
      const help = this.toolhelpmessage;
      this.state.toolmessages.help = null;
      this.state.toolmessages.help = help;
    })
  },
  async mounted() {
    await this.$nextTick();
    $(this.$refs.editingbutton).tooltip();
  }
});

module.exports = ToolboxComponent;


