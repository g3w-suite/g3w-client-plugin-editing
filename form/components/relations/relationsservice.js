var RelationsService = function() {
  this.state = {
    relations: []
  };
  this.addRelation = function(relation) {
    // vado ad aggiungere la proprietà relations che servirà alle singole relazioni
    // per aggiungere (linkare) rewlazioni
    this.state.relations.push(relation);
  };
  this.validateRealtions = function() {
    var isValid = true;
    _.forEach(this.state.relation, function() {

    });
    return isValid;
  }
};

module.exports = new RelationsService;