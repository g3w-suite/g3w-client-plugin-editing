var AddRelationWorkflow = require('../../../workflows/addrelationworkflow');

var RelationService = function() {
  this.addRelation = function(options) {
    console.log(options);
  }
};

module.exports = RelationService;