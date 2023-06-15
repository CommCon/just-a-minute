/**
 * This class copies the interface from Controller.js and extends it to add support for Buzz controller lights.
 */
var BuzzController = Controller;
const hid_supported = "hid" in window.navigator;

Object.defineProperty(BuzzController, "lights", {
    get: function () {
        return this._lights;
    },
    set: function (newData) {
        //if newData is negative, wrap it round from the maxiumum
        if (newData <= 0) {
            newData = 16 + newData;
        }
        this._lights = newData % 16;
        let sl = setLights.bind(this);
        sl(this._lights);
    }
});

Object.defineProperty(BuzzController, "lights_supported", {
    get: function () {
        let hw_supported = Controller.supported && hid_supported;
        return hw_supported;
    }
});

async function runHIDSetup() {
    if (hid_supported && !this.getting_hid) {
        this.getting_hid = true;
        let hid_gamepads = await navigator.hid.getDevices();
        if (hid_gamepads.length == 0) {
            hid_gamepads = await navigator.hid.requestDevice({
                filters: [
                    {
                        vendorId: 0x054c, //Logitech wired PS2 controller
                        productId: 0x0002,
                    },
                    {
                        vendorId: 0x1356, //wireless playstation controller
                        productId: 0x4096,
                    },
                    {
                        vendorId: 0x54c, // unknown other controller
                        productId: 0x1000,
                    }
                ],
            });
        }
        if (hid_gamepads) {
            this.hid_device = hid_gamepads[0];
            // console.log(hid_gamepad);
            if (!this.hid_device.opened) {
                await this.hid_device.open();
            }
        }
        this.getting_hid = false;
    } else {
        console.log("not supported!");
    }
}

async function setLights(state) {
    // if there is no device the first time, find one.
    if (!this.hid_device) {
        let rhs = runHIDSetup.bind(this);
        await rhs();
    }
    //if there is still no device, fail.
    if (!this.hid_device) {
        console.error("No HID device to send light states to.");
        return;
    }
    state %= 16;
    // console.log("bin mod", state, (state >>> 0).toString(2).padStart(4, 0));
    //convert the decimal coerced number back to binary digits
    let binVal = (state >>> 0).toString(2).padStart(4, 0);
    let arr = [0]; //padding of one unit
    for (let digit of binVal) {
        arr.push(parseInt(digit));
    }
    this.hid_device.sendReport(0, Uint8Array.from(arr));
}

export default BuzzController;