const Tools = require('./toolsoftool/tools');
const compiledTemplate = Vue.compile(require('./toolsoftool.html'));
const ToolsOfToolComponent = Vue.extend({
  ...compiledTemplate,
  props: ['tools'],
  components: {
    snap: Tools.snap
  },
  data: function() {
    return {}
  }
});

module.exports = ToolsOfToolComponent;
