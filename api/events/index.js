const EventService = function() {
  this._eventbus = new Vue();
  this.getEventBus = function() {
    return this._eventbus;
  }
};

export default new EventService();
