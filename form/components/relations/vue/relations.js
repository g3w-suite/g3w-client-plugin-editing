var RelationComponent = require('../../relation/vue/relation');
var RelationsComponentObj = {
  template: require('./relations.html'),
  components: {
    'relation': RelationComponent
  }
};

module.exports = RelationsComponentObj;