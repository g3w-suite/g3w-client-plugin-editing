import { Workflow } from '../g3wsdk/workflow/workflow';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
 * 
 * force parent workflow form service to update
 * update only when workflow has service (form service)
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function updateParentWorkflows() {
 (Workflow.Stack.getParents() || [Workflow.Stack.getCurrent()])
  .forEach(w => w.getContextService() && w.getContextService().setUpdate(true, { force: true }))
}