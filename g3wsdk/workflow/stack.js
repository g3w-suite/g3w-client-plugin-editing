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

  /**
   * @FIXME add description
   */
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

  /**
   * @FIXME add description
   */
  pop() {
   return this._workflows.pop()
  }

  /**
   * @FIXME add description
   */
  getLength() {
    return this._workflows.length;
  }

  /**
   * @FIXME add description
   */
  _getCurrentIndex() {
    const currentWorkflow = this.getCurrent();
    return this._workflows.findIndex(workfow => workfow === currentWorkflow)
  }

  /**
   * @FIXME add description
   */
  getCurrent() {
    return this.getLast();
  }

  /**
   * @FIXME add description
   */
  getLast() {
    const length = this._workflows.length;
    return length ? this._workflows[length -1] : null;
  }

  /**
   * @FIXME add description
   */
  getFirst() {
    return this._workflows[0];
  }

  /**
   * @FIXME add description
   */
  removeAt(index) {
    this._workflows.splice(index, 1);
  }

  /**
   * @FIXME add description
   */
  getAt(index) {
    return this._workflows[index];
  }

  /**
   * @FIXME add description
   */
  insertAt(index, workflow) {
    this._workflows[index] = workflow;
  }

  /**
   * @FIXME add description
   */
  clear() {
    while (this._workflows.length) {
      const workflow = this.pop();
      workflow.stop();
    }
  }

}

export default new WorkFlowsStack();