'use strict';

function setBufferSize(bs_item) {
    buffer_size = parseInt(bs_item.options[bs_item.selectedIndex].value);
    if (buffer_size === 128 && rendering_mode === "ScriptProcessor") {
        console.log("buffer_size cannot be set to 128 in ScriptProcessor mode !");
        buffer_size = 256;
        restoreMenu("selectedBuffer", buffer_size);
    }
	console.log("setBufferSize", buffer_size);
}

function setPoly(poly_item) {
	poly_flag = poly_item.options[poly_item.selectedIndex].value;
	console.log("setPoly", poly_flag);
}

function setPolyVoices(voices_item) {
	poly_nvoices = voices_item.options[voices_item.selectedIndex].value;
	console.log("setPolyVoices", poly_nvoices);
}

function setFTZ(ftz_item) {
	ftz_flag = ftz_item.options[ftz_item.selectedIndex].value;
}

function setRenderingMode(rendering_item) {
    rendering_mode = rendering_item.options[rendering_item.selectedIndex].value;
    if (rendering_mode === "AudioWorklet") {
        console.log("setRenderingMode AudioWorklet");
        buffer_size = 128;
        restoreMenu("selectedBuffer", buffer_size);
        document.getElementById("selectedBuffer").disabled = true;
    } else {
        buffer_size = 256;
        restoreMenu("selectedBuffer", buffer_size);
        document.getElementById("selectedBuffer").disabled = false;
    }
}

// MIDI input handling
function keyOn(channel, pitch, velocity) {
	if (DSP && isPoly) {
		DSP.keyOn(channel, pitch, velocity);
	}
}

function keyOff(channel, pitch, velocity) {
	if (DSP && isPoly) {
		DSP.keyOff(channel, pitch, velocity);
	}
}

function pitchWheel(channel, bend) {
	if (DSP) {
		DSP.pitchWheel(channel, bend);
	}
}

function ctrlChange(channel, ctrl, value) {
	if (DSP) {
		DSP.ctrlChange(channel, ctrl, value);
	}
}

function midiMessageReceived(ev) {
	var cmd = ev.data[0] >> 4;
	var channel = ev.data[0] & 0xf;
	var data1 = ev.data[1];
	var data2 = ev.data[2];

	if (channel === 9) {
		return;
	} else if (cmd === 8 || ((cmd === 9) && (data2 === 0))) {
		keyOff(channel, data1, data2);
	} else if (cmd === 9) {
		keyOn(channel, data1, data2);
	} else if (cmd === 11) {
		ctrlChange(channel, data1, data2);
	} else if (cmd === 14) {
		pitchWheel(channel, ((data2 * 128.0 + data1) - 8192) / 8192.0);
	}
}

function onerrorcallback(error) {
	console.log(error);
}

function onsuccesscallbackStandard(access) {

    access.onstatechange = function(e) {
        if (e.port.type === "input") {
            if (e.port.state  === "connected") {
                console.log(e.port.name + " is connected");
                e.port.onmidimessage = midiMessageReceived;
            } else if (e.port.state  === "disconnected") {
                console.log(e.port.name + " is disconnected");
                e.port.onmidimessage = null;
            }
        }
    }

    for (var input of access.inputs.values()) {
        input.onmidimessage = midiMessageReceived;
        console.log(input.name + " is connected");
    }
}

function activateMIDIInput() {
	console.log("activateMIDIInput");
	if (typeof(navigator.requestMIDIAccess) !== "undefined") {
		navigator.requestMIDIAccess().then(onsuccesscallbackStandard, onerrorcallback);
	} else {
		alert(
			"MIDI input cannot be activated, either your browser still does't have it, or you need to explicitly activate it."
		);
	}
}

// Audio input handling
function activateAudioInput() {
	console.log("activateAudioInput");
	if (!navigator.getUserMedia) {
		navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	}

	if (navigator.getUserMedia) {
		navigator.getUserMedia({
			audio: { echoCancellation: false }
		}, getDevice, function(e) {
			alert('Error getting audio input');
			console.log(e);
			audio_input = null;
		});
	} else {
		alert('Audio input API not available');
	}
}

function getDevice(device) {
	// Create an AudioNode from the stream.
	audio_input = audio_context.createMediaStreamSource(device);

	// Connect it to the destination.
	audio_input.connect(DSP);
}

// Save/Load functions using local storage

function setLocalStorage(state) {
	console.log(state);
	if (typeof(Storage) !== "undefined") {
		localStorage.setItem("FaustLocalStorage", ((state) ? "on" : "off"));
	}
}

function setDSPStorage(state) {
	console.log(state);
	if (typeof(Storage) !== "undefined") {
		localStorage.setItem("FaustDSPStorage", ((state) ? "on" : "off"));
	}
}

function restoreMenu(id, value) {
    if (document.getElementById(id)) {
        for (var i = 0; i < document.getElementById(id).length; i++) {
            // Weak comparison here
            if (document.getElementById(id).options[i].value == value) {
                document.getElementById(id).selectedIndex = i;
                break;
            }
        }
    }
}

function saveDSPState() {
	if (typeof(Storage) !== "undefined" && localStorage.getItem("FaustDSPStorage") === "on") {
		var params = DSP.getParams();
		for (var i = 0; i < params.length; i++) {
			localStorage.setItem(params[i], DSP.getParamValue(params[i]));
		}
	}
}

function loadDSPState() {
	if (typeof(Storage) !== "undefined" && localStorage.getItem("FaustDSPStorage") === "on") {
		var params = DSP.getParams();
		for (var i = 0; i < params.length; i++) {
			if (localStorage.getItem(params[i])) {
				// Restore DSP state
				DSP.setParamValue(params[i], Number(localStorage.getItem(params[i])));
				// Restore GUI state
				output_handler(params[i], Number(localStorage.getItem(params[i])));
			}
		}
	}
}

function savePageState() {
    if (typeof(Storage) !== "undefined" && localStorage.getItem("FaustLocalStorage") === "on") {
        localStorage.setItem("buffer_size", buffer_size);
        localStorage.setItem("poly_flag", poly_flag);
        localStorage.setItem("ftz_flag", ftz_flag);
        localStorage.setItem("poly_nvoices", poly_nvoices);
        localStorage.setItem("rendering_mode", rendering_mode);
    }
}

function loadPageState() {
    if (typeof(Storage) !== "undefined" && localStorage.getItem("FaustLocalStorage") === "on") {
        buffer_size = (localStorage.getItem("buffer_size") ? localStorage.getItem("buffer_size") : 256);
        poly_flag = (localStorage.getItem("poly_flag") ? localStorage.getItem("poly_flag") : "OFF");
        poly_nvoices = (localStorage.getItem("poly_nvoices") ? localStorage.getItem("poly_nvoices") : 16);
        ftz_flag = (localStorage.getItem("ftz_flag") ? localStorage.getItem("ftz_flag") : 2);
        rendering_mode = (localStorage.getItem("rendering_mode") ? localStorage.getItem("rendering_mode") : "ScriptProcessor");

        // Restore menus
        restoreMenu("selectedBuffer", buffer_size);
        restoreMenu("selectedPoly", poly_flag);
        restoreMenu("polyVoices", poly_nvoices);
        restoreMenu("selectedFTZ", ftz_flag);
        restoreMenu("selectedRenderingMode", rendering_mode);

        if (rendering_mode === "AudioWorklet") {
            document.getElementById("selectedBuffer").disabled = true;
        }
    }
}

function checkPolyphonicDSP(json) {
    if (!((json.indexOf("/freq") !== -1)
        && (json.indexOf("/gain") !== -1)
        && (json.indexOf("/gate") !== -1))) {
        alert("Faust DSP code is not Polyphonic, it will probably not work correctly in this mode...");
    }
}
