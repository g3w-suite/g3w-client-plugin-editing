import { Workflow } from '../g3wsdk/workflow/workflow';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
 * 
 * force parent workflow form service
 * update only when workflow has service (form service)
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function updateWorkflows() {
   Workflow.Stack._workflows
     .filter(w => w.getContextService())
     .forEach(w => w.getContextService().setUpdate(true, { force: true }))
}