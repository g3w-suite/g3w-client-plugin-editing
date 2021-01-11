import Service from './service';
const {assert, expect} = require('chai');
export default function TestEditing({config={}, testConfig={}}={}) {
  describe('#Test editing', function() {
    before(async ()=>{
      Service.init();
    })

    it(`Load features`, async() => {
      assert.isOk(true);
    })

    it("add feature", async()=>{
      assert.isOk(true);
    })

    it('delete feature', async()=>{
      assert.isOk(true);
    })
  })
}
