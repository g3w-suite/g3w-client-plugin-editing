import Editor           from './editing/editor';
import ChangesManager   from './editing/changesmanager';
import SessionsRegistry from './editing/sessionsregistry';
import Session          from './editing/session';
import { Step }         from './workflow/step';
import { Flow }         from '../deprecated';
import { Workflow }     from './workflow/workflow';

/**
 * Editing APIs will be removed from core after g3w-client@v.4.x
 */
if (
  window.g3wsdk.core.editing ||
  window.g3wsdk.core.workflow ||
  window.g3wsdk.constant.DEFAULT_EDITING_CAPABILITIES ||
  g3wsdk.version < '4'
) {
  console.warn('Editing APIs will be removed from g3wsdk after v4.x');
}

/**
 * @FIXME add description
 */
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
window.g3wsdk.constant.DEFAULT_EDITING_CAPABILITIES = [
  'add_feature',
  'change_feature',
  'change_attr_feature',
  'delete_feature',
];

/**
 * @FIXME add description
 */
window.g3wsdk.core.workflow = {
  Task: Step,
  Step,
  Flow,
  Workflow,
  WorkflowsStack: Workflow.Stack
};