/**
 * @file Store user session (login / logout)
 * 
 * ORIGINAL SOURCE: g3w-client/src/store/sessions.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

class SessionsRegistry {

  constructor() {
    this._sessions = {};
  }

  register(session) {
    const id = session.getId();
    this._sessions[id] = session;
  }

  unregister(id) {
    delete this._sessions[id];
  }

  getSession(id) {
    return this._sessions[id];
  };

  setSession(id, session) {
    this._sessions[id] = session;
  }

  getSessions() {
    return this._sessions;
  }

  clear() {
    this._sessions = {};
  }

};

export default new SessionsRegistry();