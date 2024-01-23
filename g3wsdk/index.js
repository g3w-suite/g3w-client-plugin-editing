import Editor           from './editor';
import ChangesManager   from './changesmanager';
import SessionsRegistry from './sessionsregistry';
import Session          from './session';

/**
 * Editing API will be removed from core after g3w-client@v.4.x 
 */
if (window.g3wsdk.core.editing || g3wsdk.version < '4') {
  console.log('g3wsdk.core.editing will be overwritten');
}

window.g3wsdk.core.editing = {
  Session,
  SessionsRegistry,
  Editor,
  ChangesManager
};

/**
 * Default editing capabilities
 *
 * @type {string[]}
 */
export const DEFAULT_EDITING_CAPABILITIES = [
  'add_feature',
  'change_feature',
  'change_attr_feature',
  'delete_feature',
];

window.g3wsdk.constant.DEFAULT_EDITING_CAPABILITIES = DEFAULT_EDITING_CAPABILITIES;


