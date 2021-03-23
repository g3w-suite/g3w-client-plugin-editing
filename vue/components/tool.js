const compiledTemplate = Vue.compile(require('./tool.html'));
const ToolComponent = Vue.extend({
  ...compiledTemplate,
  props: ['state' ,'resourcesurl'],
  data: function() {
    return {}
  },
  methods: {
    toggletool() {
    if (!this.state.active) this.$emit('setactivetool', this.state.id);
      else this.$emit('stopactivetool');
    }
  }
});

Vue.component('tool', ToolComponent);

module.exports = ToolComponent;


