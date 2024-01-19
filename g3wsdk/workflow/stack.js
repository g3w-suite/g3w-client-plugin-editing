/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/services/workflow.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

/**
 * @file
 * @since v3.6
 */

// Store all workflow activated
class WorkFlowsStack {

  constructor() {
    this._workflows = [];
  }

  push(workflow) {
    if (this._workflows.indexOf(workflow) === -1) return this._workflows.push(workflow) - 1;
    return this._workflows.indexOf(workflow);
  }

  /**
   * Get parent
   * @returns {boolean|*}
   */
  getParent() {
    const index = this._getCurrentIndex();
    return index > 0 &&  this._workflows[index -1];
  }

  /**
   * Get all list of parents
   * @returns {boolean|T[]}
   */
  getParents() {
    const index = this._getCurrentIndex();
    return index > 0 && this._workflows.slice(0, index);
  }

  pop() {
   return this._workflows.pop()
  }

  getLength() {
    return this._workflows.length;
  }

  _getCurrentIndex() {
    const currentWorkflow = this.getCurrent();
    return this._workflows.findIndex(workfow => workfow === currentWorkflow)
  }

  getCurrent() {
    return this.getLast();
  }

  getLast() {
    const length = this._workflows.length;
    return length ? this._workflows[length -1] : null;
  }

  getFirst() {
    return this._workflows[0];
  }

  removeAt(index) {
    this._workflows.splice(index, 1);
  }

  getAt(index) {
    return this._workflows[index];
  }

  insertAt(index, workflow) {
    this._workflows[index] = workflow;
  }

  clear() {
    while (this._workflows.length) {
      const workflow = this.pop();
      workflow.stop();
    }
  }

}

export default new WorkFlowsStack();