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

  addTask(task) {
    this.tasks.push(task);
  }

  run(reverse = false) {
    while (this.tasks.length) {
      const task  = reverse ? this.tasks.pop() : this.tasks.shift();
      task();
    }
  }

  flush() {
    return this.tasks.splice(0);
  }

  getLength() {
    return this.tasks.length;
  }

  clear() {
    this.run();
    this.tasks = [];
  }

}