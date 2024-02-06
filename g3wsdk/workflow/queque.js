/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/workflow/queque.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

export default class Queque {

  constructor() {
    this.tasks = [];
  }
  /**
   * @FIXME add description
   */
  addTask(task) {
    this.tasks.push(task);
  }
  /**
   * @FIXME add description
   */
  run(reverse = false) {
    while (this.tasks.length) {
      const task  = reverse ? this.tasks.pop() : this.tasks.shift();
      task();
    }
  }
  /**
   * @FIXME add description
   */
  flush() {
    return this.tasks.splice(0);
  }

  /**
   * @FIXME add description
   */
  getLength() {
    return this.tasks.length;
  }

  /**
   * @FIXME add description
   */
  clear() {
    this.run();
    this.tasks = [];
  }

}