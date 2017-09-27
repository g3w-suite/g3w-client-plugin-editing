var RelationsService = function(options) {
  options = options || {};
  this._formEventBus = options.formEventBus;
  this.state = {
    relations: []
  }
};

var proto = RelationsService.prototype;

proto.getFormEventBus = function() {
  return this._formEventBus;
};

proto.addRelation = function(relation) {
  this.state.relations.push(relation);
};

proto.validateRelations = function() {
  var isValid = true;
  _.forEach(this.state.relations, function(relation) {
    //TODO
  });
  return isValid;
};


module.exports = RelationsService;