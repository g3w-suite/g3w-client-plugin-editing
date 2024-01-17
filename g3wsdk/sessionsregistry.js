/**
 * @file Store user session (login / logout)
 * 
 * ORIGINAL SOURCE: g3w-client/src/store/sessions.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v4.x
 */

const SessionsRegistry = function() {
  this._sessions = {};

  this.register = function(session) {
    const id = session.getId();
    this._sessions[id] = session;
  };

  this.unregister = function(id) {
    delete this._sessions[id];
  };

  this.getSession = function(id) {
    return this._sessions[id];
  };

  this.setSession = function(id, session) {
    this._sessions[id] = session;
  };

  this.getSessions = function() {
    return this._sessions;
  };

  this.clear = function(){
    this._sessions = {};
  }
};

export default new SessionsRegistry();