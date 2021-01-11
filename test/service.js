const EditingService = require('editing/services/editingservice');

export default {
  init() {
    require('../index')
  },
  getEditingService(){
    return EditingService;
  }
}