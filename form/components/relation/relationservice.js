var AddRelationWorkflow = require('../../../workflows/addrelationworkflow');
var RelationService = function() {
  this.addRelation = function(options) {
    var d = $.Deferred();
    options = options || {};
    var workflow = new AddRelationWorkflow();
    workflow.start(options)
      .then(function(feature) {
        d.resolve(feature);
      })
      .fail(function(err) {
        console.log(err);
      });
    return d.promise();
  }
};

module.exports = RelationService;