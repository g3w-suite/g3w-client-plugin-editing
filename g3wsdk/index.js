import Editor                            from './editing/editor';
import { Step }                          from './workflow/step';
import { Flow, ChangesManager, Session } from '../deprecated';
import { Workflow }                      from './workflow/workflow';

/**
 * Editing APIs will be removed from core after g3w-client@v.4.x
 */
if (
  window.g3wsdk.core.editing
  || window.g3wsdk.core.workflow
  || window.g3wsdk.constant.DEFAULT_EDITING_CAPABILITIES
  || g3wsdk.version < '4'
) {
  console.warn('Editing APIs will be removed from g3wsdk after v4.x');
}

/**
 * Object to provide external plugin to use editing objects
 */
window.g3wsdk.core.editing = {
  Session,
  SessionsRegistry: Session.Registry,
  Editor,
  ChangesManager,
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
 * Object to provide to external plugins to use workflow objects
 */
window.g3wsdk.core.workflow = {
  Task: Step,
  Step,
  Flow,
  Workflow,
  WorkflowsStack: Workflow.Stack
};