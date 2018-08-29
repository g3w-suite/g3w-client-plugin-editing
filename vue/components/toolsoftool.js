const Tools = require('./toolsoftool/tools');

var ToolsOfToolComponent = Vue.extend({
  template: require('./toolsoftool.html'),
  props: ['tools'],
  components: {
    snap: Tools.snap
  },
  data: function() {
    return {}
  }
});

module.exports = ToolsOfToolComponent;
