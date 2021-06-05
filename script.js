/*  =========================================================================
	 OBJECT MODEL
	========================================================================= */

	/*  ----------------------------------------
		 APP CONST
		---------------------------------------- */

		var builtInScreenAlreadyFound = false;

	/*  ----------------------------------------
		 SCREEN
		---------------------------------------- */

		class Screen
		{
			constructor() {
				// Device detection values
				this.name = "";
				this.deviceFamily = "";
				// Screen data
				this.diagonal = null;
				this.dpi = "";
				this.builtIn = false;
				// Resolution data
				this.dppx = window.devicePixelRatio;
				this.wRes = window.screen.width * this.dppx;
				this.hRes = window.screen.height * this.dppx;
				// Units
				this.preferredUnit = "cm";
				// Others
				this.preferredCalibrationObject = 0;
				this.calibrationStatus = null;
				this.confirmedCalibration = false;

				/*
					IDEAS :
					- built-in-screen : allows to detect external monitor easily if new screen added
				*/
			}
		}

		var cScreen = new Screen();

	/*  ----------------------------------------
		 CALIBRATION OBJECTS
		---------------------------------------- */

		class CalibrationObjects
		{
		    constructor(n, w, h) {
		        this.name = n;
		        this.width = w;
		        this.height = h;
		    }
		}

/*  =========================================================================
	 POSSIBLE RESOLUTIONS
	========================================================================= */

	var lResolutions = [5, 5.5, 6, 6.5, 7, 8, 9, 9.7, 10.1, 11.6, 13.3, 14, 15.6, 17.3, 19, 21.5, 24, 27, 32, 49];

/*  =========================================================================
	 CALIBRATION OBJECTS
	========================================================================= */

	var lcalibObjects = [
		new CalibrationObjects("Credit Card", 8.56, 5.398),
		new CalibrationObjects("A4 sheet portrait", 21, 6),
		new CalibrationObjects("5 €", 12, 6.2),
		new CalibrationObjects("10 €", 12.7, 6.7),
		new CalibrationObjects("20 €", 13.3, 7.2),
		new CalibrationObjects("US dollar bill", 15.5955, 6.6294),
		new CalibrationObjects("5 cm", 5, 5),
		new CalibrationObjects("10 cm", 10, 10),
		new CalibrationObjects("20 cm", 20, 20),
	];


/*  =========================================================================
	 UTILITIES
	========================================================================= */

	/*  ----------------------------------------
		 DPI CALCULATION
		---------------------------------------- */

		function dpiCalculation()
		{
			let diagonalInPixels = Math.sqrt(Math.pow(cScreen.hRes, 2) + Math.pow(cScreen.wRes, 2)); // Pythagoras
			let wResInches = cScreen.wRes * cScreen.diagonal / diagonalInPixels;// cross-multiplication
			let dpi = cScreen.wRes / wResInches;
			return dpi;
		}

		function dpcmCalculation()
		{ return 0.3937008 * dpiCalculation(); }


	/*  ----------------------------------------
		 REAL UNITS
		---------------------------------------- */

		function realInch(x=1)
		{ return x * dpiCalculation() / cScreen.dppx + "px"; }

		function realCm(x=1)
		{ return x * dpcmCalculation() / cScreen.dppx + "px"; }


/*  =========================================================================
	 FUNCTIONALITIES
	========================================================================= */

	/*  ----------------------------------------
		 INTERFACE GENERATION
		---------------------------------------- */

		function screenSizeButtonsGeneration()
		{
			let generatedButtons = "";
			for(var i=0 ; i<lResolutions.length ; i++) {
				// TODO : touch does'nt work
				generatedButtons += '<button onmousedown="changeResolution(' + lResolutions[i] + ')" >' + lResolutions[i] + '"' + '</button>';
			}
			//generatedButtons += '<input id="customResolution"  autocomplete="off" placeholder=' + 'X.XX"' '\'/>';
			generatedButtons += "<input id=\"customResolution\" autocomplete=\"off\" placeholder='X.XX\"' onchange='changeResolution(this.value)'/>";
			document.getElementById("screenSizeButtons").innerHTML = generatedButtons;
		}

		function calibrationObjectsListGeneration()
		{
			let generatedSelect = "";
			for(var i=0 ; i<lcalibObjects.length ; i++) {
				// TODO : touch does'nt work
				generatedSelect += "<option value='" + i + "'>" + lcalibObjects[i].name + "</option>";//'<button onmousedown="changeResolution(' + lResolutions[i] + ')" >' + lResolutions[i] + '"' + '</button>';
			}
			//generatedButtons += '<input id="customResolution"  autocomplete="off" placeholder=' + 'X.XX"' '\'/>';
			//generatedSelect += "<input id=\"customResolution\" autocomplete=\"off\" placeholder='X.XX\"' onchange='changeResolution(this.value)'/>";
			document.getElementById("calibrationObjectsList").innerHTML = generatedSelect;
		}

	/*  ----------------------------------------
		 CALIBRATION MODES
		---------------------------------------- */

		/*  ---------------
			 DEVICE DETECTION
			--------------- */

			function deviceRetrieval()
			{
				var alreadyCalibrated = localSaveRead();//readCookie();
				if (alreadyCalibrated === -1) {
					cScreen.diagonal = 15.4; // default value
					cScreen.name = "Unknown device";

					var detectedScreen = deviceDetection(builtInScreenAlreadyFound);


					// INTERFACE DATA UPDATE
					cScreen.name = detectedScreen.name;
					cScreen.diagonal = detectedScreen.screenSize;
					cScreen.dpi = detectedScreen.dpi;
					cScreen.builtIn = detectedScreen.builtIn;
					setCalibrationStatus(detectedScreen.confidence);

					//localSaveEdit(); -> deja inclus dans setCalibrationStatus()
				}
				else
				{
					setCalibrationStatus(cScreen.calibrationStatus);
					//console.log("TEST : " + screen.calibrationStatus)
				}
			}

		/*  ---------------
			 CALIBRATION MEMORY
			--------------- */

			function localSaveEdit()
			{
				//localStorage.setItem('monChat', JSON.stringify(screen));
				let currentScreenIsNew = true;
				var i;
				for(i=0 ; i<localStorage.length; i++) {
					var key = localStorage.key(i);
					var value = JSON.parse(localStorage[key]);
					console.log(key + " => " + value.name);
					//console.log(value.wRes + " = " + screen.wRes + " - " + value.hRes + " = " + screen.hRes);
					if(value.wRes == cScreen.wRes || value.hRes == cScreen.hRes)
					{
						localStorage.setItem(key, JSON.stringify(cScreen));
						currentScreenIsNew = false;
					}
				}
				if (currentScreenIsNew === true)
				{
					localStorage.setItem("screen " + i, JSON.stringify(cScreen));
				}
			}

			function localSaveRemove()
			{
				//localStorage.removeItem('myCat');
				localStorage.clear();
			}

				function resetApp()
				{
					localSaveRemove();
					document.location.reload();
				}

			function localSaveRead()
			{
				let currentScreenIsNew = true;
				var i;
				for(i=0 ; i<localStorage.length; i++) {
					var key = localStorage.key(i);
					var value = JSON.parse(localStorage[key]);
					console.log(key + " => " + value.name);
					if (value.builtIn === true)
						builtInScreenAlreadyFound = true;
					if(value.wRes == cScreen.wRes || value.hRes == cScreen.hRes)
					{
						currentScreenIsNew = false;
						// INJECT THE CALIBRATION DATA IN THE APP
						try {
							cScreen.name = value.name;
							cScreen.deviceFamily = value.deviceFamily;
							cScreen.diagonal = value.diagonal;
							cScreen.dpi = value.dpi;
							cScreen.builtIn = value.builtIn;
							cScreen.dppx = value.dppx;
							cScreen.wRes = value.wRes;
							cScreen.hRes = value.hRes;
							cScreen.preferredUnit = value.preferredUnit;
							cScreen.preferredCalibrationObject = value.preferredCalibrationObject;
							cScreen.confirmedCalibration = value.confirmedCalibration;
							cScreen.calibrationStatus = value.calibrationStatus;
							return 1;
						}
						catch(e) {
							return -1;
						}
					}
				}
				if (currentScreenIsNew === true)
				{
					return -1;
				}
				/*
				var cat = localStorage.getItem('monChat');
				cat = JSON.parse(cat);
				console.log("T : " + cat.wRes);*/
			}


			//localSaveEdit();
			//localSaveRead();
			//localSaveRemove();
			//localSaveRead();


/*
			// COOKIE CREATION
			function editCookie()
			{
				// Expiration date generation
				var d = new Date();
				d.setDate(Date.now() + 365 * 5);
				var expires = "expires="+d.toUTCString();
				// Final write
				document.cookie = "name=" + screen.name + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "deviceFamily=" + screen.deviceFamily + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "diagonal=" + screen.diagonal + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "dpi=" + screen.dpi + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "dppx=" + screen.dppx + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "wRes=" + screen.wRes + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "hRes=" + screen.hRes + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "preferredUnit=" + screen.preferredUnit + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "preferredCalibrationObject=" + screen.preferredCalibrationObject + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "confirmedCalibration=" + screen.confirmedCalibration + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "calibrationStatus=" + screen.calibrationStatus + ";" + expires + "; SameSite=None; Secure";
				console.log("COOKIES UPDATE : " + document.cookie);
				//removeCookie();
			}

			function removeCookie()
			{
				// Expiration date generation
				var expires = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
				// Final write
				document.cookie = "name=" + screen.name + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "deviceFamily=" + screen.deviceFamily + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "diagonal=" + screen.diagonal + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "dpi=" + screen.dpi + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "dppx=" + screen.dppx + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "wRes=" + screen.wRes + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "hRes=" + screen.hRes + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "preferredUnit=" + screen.preferredUnit + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "preferredCalibrationObject=" + screen.preferredCalibrationObject + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "confirmedCalibration=" + screen.confirmedCalibration + ";" + expires + "; SameSite=None; Secure";
				document.cookie = "calibrationStatus=" + screen.calibrationStatus + ";" + expires + "; SameSite=None; Secure";
				console.log("COOKIES UPDATE : " + document.cookie);
			}



			function readCookie()
			{
				var cookies = getCookiesMap(document.cookie);

				if (	(typeof cookies["name"] !== 'undefined') || (typeof cookies["deviceFamily"] !== 'undefined') ||
						(typeof cookies["diagonal"] !== 'undefined') || (typeof cookies["dpi"] !== 'undefined') ||
						(typeof cookies["dppx"] !== 'undefined') || (typeof cookies["wRes"] !== 'undefined') ||
						(typeof cookies["hRes"] !== 'undefined') || (typeof cookies["preferredUnit"] !== 'undefined') || 
						(typeof cookies["preferredCalibrationObject"] !== 'undefined') ||
						(typeof cookies["confirmedCalibration"] !== 'undefined')	)
				{
					// IF AN UNKNOWN SCREEN IS DETECTED
					var t1 = parseFloat(cookies["wRes"]);
					var t2 = screen.wRes;
					if(parseFloat(cookies["wRes"]) != screen.wRes || parseFloat(cookies["hRes"]) != screen.hRes)
					{
						alert("new screen");
					}
					else
					{
						// INJECT THE CALIBRATION DATA IN THE APP
						try {
							screen.name = cookies["name"];
							screen.deviceFamily = cookies["deviceFamily"];
							screen.diagonal = parseFloat(cookies["diagonal"]);
							screen.dpi = parseFloat(cookies["dpi"]);
							screen.dppx = parseFloat(cookies["dppx"]);
							screen.wRes = parseFloat(cookies["wRes"]);
							screen.hRes = parseFloat(cookies["hRes"]);
							screen.preferredUnit = cookies["preferredUnit"];
							screen.preferredCalibrationObject = parseFloat(cookies["preferredCalibrationObject"]);
							screen.confirmedCalibration = (cookies["confirmedCalibration"] === 'true');
							screen.calibrationStatus = parseFloat(cookies["calibrationStatus"]);
							return 1;
						}
						catch(e) {
							return -1;
						}
					}
				}
				else {
					return -1;
				}
			}


				// https://stackoverflow.com/questions/5142337/read-a-javascript-cookie-by-name/11767598
				function getCookiesMap(cookiesString)
				{
					return cookiesString.split(";")
					.map(function(cookieString) {
						return cookieString.trim().split("=");
					})
					.reduce(function(acc, curr) {
						acc[curr[0]] = curr[1];
						return acc;
					}, {});
				}*/

		/*  ---------------
			 STATUS
			--------------- */

			function confirmCalibration()
			{
				setCalibrationStatus(3);
				cScreen.confirmedCalibration = true;
				localSaveEdit();//editCookie();
			}

			function setCalibrationStatus(s)
			{
				let warningMsg = "<p>check your screen calibration (confirm your model or verify the frame fits a credit card)</p><p>else, proceed manual calibration</p>";
				let basicInstructionMsg = "<p>enter a width and an height to change my size</p>";
				if (s === 4) {
					cScreen.calibrationStatus = 4;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/valid-icon.svg");
					cScreen.name = "user-calibrated screen";
					document.getElementById("calibrationStatus").innerHTML = cScreen.name;
					document.getElementById("deviceName").textContent = cScreen.name;
					document.getElementById("confirm-calibration-button").style.display = "none";
					document.getElementById("instructions").getElementsByTagName("h1")[0].innerHTML = basicInstructionMsg;
					localSaveEdit();
				}
				if (s === 3) {
					cScreen.calibrationStatus = 3;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/valid-icon.svg");
					document.getElementById("calibrationStatus").innerHTML = "self-calibrated";
					document.getElementById("confirm-calibration-button").style.display = "none";
					document.getElementById("reset-button").style.display = "none";
					document.getElementById("instructions").getElementsByTagName("h1")[0].innerHTML = basicInstructionMsg;
					localSaveEdit();
				}
				else if (s === 2) {
					cScreen.calibrationStatus = 2;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/approximation-icon-v2.svg");
					document.getElementById("calibrationStatus").innerHTML = "probably self-calibrated";
					document.getElementById("reset-button").style.display = "none";
					document.getElementById("instructions").getElementsByTagName("h1")[0].innerHTML = warningMsg + basicInstructionMsg;
				}
				else if (s === 1) {
					cScreen.calibrationStatus = 1;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/warning-icon.svg");
					document.getElementById("calibrationStatus").innerHTML = "poorly self-calibrated";
					document.getElementById("reset-button").style.display = "none";
					document.getElementById("instructions").getElementsByTagName("h1")[0].innerHTML = warningMsg + basicInstructionMsg;
				}
				else if (s === 0) {
					cScreen.calibrationStatus = 0;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/unknown-error-icon-v2.svg");
					document.getElementById("calibrationStatus").innerHTML = "not calibrated";
					document.getElementById("reset-button").style.display = "none";
					document.getElementById("instructions").getElementsByTagName("h1")[0].innerHTML = warningMsg + basicInstructionMsg;
				}
				else if (s === -1) {
					document.getElementById("calibrationStatus").textContent = "manual calibration";
					document.getElementById("deviceName").textContent = "manual calibration";
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/calibration-icon.svg");
					document.getElementById("confirm-calibration-button").style.display = "none";
					document.getElementById("reset-button").style.display = "block";
					document.getElementById("instructions").getElementsByTagName("h1")[0].innerHTML = basicInstructionMsg;
				}
				localSaveEdit();//editCookie();
			}

		/*  ---------------
			 ON / OFF
			--------------- */

			function calibrationModeOn()
			{
				// Hide use intructions
				document.getElementById("instructions").style.display = "none";
				// Disable interface controls
				document.getElementById("input-form").style.display = "none";
				// Start -> End calibration button
				document.getElementById("calibration-button").textContent = "end calibration";
				document.getElementById("calibration-button").setAttribute("onclick","calibrationModeOff();");//.click = "calibrationModeOff();";
				// Update calibration data
				setCalibrationStatus(-1);
				// Display calibration elements
				document.getElementById("calibrationTools").style.display = "block";
				document.getElementById("calibration-zoom").style.display = "flex";
				// Add calibration controls
				window.onwheel = function() {changeResolutionOnScroll()}; // scroll
				document.addEventListener('keydown', function(event) { changeResolutionOnKeyPress(event); });
				// Draw a first frame based on the preferred calibration object (or the top listed one (credit card))
				changeCalibrationObject();
			}

			function calibrationModeOff()
			{
				// Enable interface controls
				document.getElementById("input-form").style.display = "block";
				// End -> Start calibration button
				document.getElementById("calibration-button").textContent = "manual calibration";
				document.getElementById("calibration-button").setAttribute("onclick","calibrationModeOn();");
				// Update calibration data
				setCalibrationStatus(4);
				// Hide calibration elements
				document.getElementById("calibrationTools").style.display = "none";
				document.getElementById("calibration-zoom").style.display = "none";
				// Remove calibration controls
				window.onwheel = function() {};
				// return to the asked size TODO : is it really a good idea ?
				reloadSquare();
				localSaveEdit();//editCookie();
			}


		/*  ---------------
			 WITH AN OBJECT
			--------------- */

			function changeCalibrationObject()
			{
				// apply new preferred calibration object
				cScreen.preferredCalibrationObject = document.getElementById("calibrationObjectsList").value;
				// update the frame size (orientation depending on the screen orientation)
				if(window.innerWidth > window.innerHeight) {
					document.getElementById("square").style.width = realCm(lcalibObjects[cScreen.preferredCalibrationObject].width);
					document.getElementById("square").style.height = realCm(lcalibObjects[cScreen.preferredCalibrationObject].height);
				}
				else {
					document.getElementById("square").style.width = realCm(lcalibObjects[cScreen.preferredCalibrationObject].height);
					document.getElementById("square").style.height = realCm(lcalibObjects[cScreen.preferredCalibrationObject].width);
				}
				localSaveEdit();//editCookie();
			}

			function changeResolutionOnScroll()
			{
				// Prevent actual scrolling
				event.preventDefault();
				// change the screen diagonal smoothly and keep reasonable
				let newdiagonal = cScreen.diagonal * (1 + .0025 * event.deltaY);
				if(newdiagonal >= 1 && newdiagonal <= 250) // no screen lower than 1 inche and bigger than 250 inches
				{
					// apply new diagonal
					cScreen.diagonal = newdiagonal;
					// update the frame size
					changeCalibrationObject();
					// Update calibration data
					document.getElementById("deviceScreenSize").textContent = cScreen.diagonal.toFixed(1) + " inch.";
				}
			}

			function changeResolutionOnKeyPress(event)
			{
				let newdiagonal;
				// If left, down, -
				if(event.keyCode == 37 || event.keyCode == 40 || event.keyCode == 173)
					newdiagonal = cScreen.diagonal + .2;
				// If right, up, +
				else if(event.keyCode == 39 || event.keyCode == 38 || event.keyCode == 61)
					newdiagonal = cScreen.diagonal - .2;
				// change the screen diagonal smoothly and keep reasonable
				if(newdiagonal >= 1 && newdiagonal <= 250) // no screen lower than 1 inche and bigger than 250 inches
				{
					// apply new diagonal
					cScreen.diagonal = newdiagonal;
					// update the frame size
					changeCalibrationObject(); // TODO : do not rotate
					// Update calibration data
					document.getElementById("deviceScreenSize").textContent = cScreen.diagonal.toFixed(1) + " inch.";
				}
			}

			function changeResolutionOnButton(event)
			{
				let newdiagonal;
				if(event === "-")
					newdiagonal = cScreen.diagonal + .2;
				else if(event === "+")
					newdiagonal = cScreen.diagonal - .2;
				// change the screen diagonal smoothly and keep reasonable
				if(newdiagonal >= 1 && newdiagonal <= 250) // no screen lower than 1 inche and bigger than 250 inches
				{
					// apply new diagonal
					cScreen.diagonal = newdiagonal;
					// update the frame size
					changeCalibrationObject();
					// Update calibration data
					document.getElementById("deviceScreenSize").textContent = cScreen.diagonal.toFixed(1) + " inch.";
				}
			}


		/*  ---------------
			 WITH SIZE SCREEN
			--------------- */

			function changeResolution(res)
			{
				// apply new diagonal
				cScreen.diagonal = res;
				// update the frame size
				changeCalibrationObject();
				// Update calibration data
				document.getElementById("deviceScreenSize").textContent = cScreen.diagonal + " inch.";
				// Turn off calibration mode
				calibrationModeOff();
			}


	/*  ----------------------------------------
		 FRAME SIZE UPDATE UTILITIES
		---------------------------------------- */

		/*  ---------------
			 CHANGES SIZE UNITS
			--------------- */

			function changeSizeUnit()
			{
				let sUnit = document.getElementById("sizeUnit").value;
				if(sUnit === "cm")
					cScreen.preferredUnit = "cm";
				else if(sUnit === "inches")
					cScreen.preferredUnit = "inches";
				else
					console.log("ERROR : unknown size unit (not cm, not inches)");
			}

			/*function changeSizeUnitAndReload()
			{ changeSizeUnit(); reloadSquare(); }*/

		/*  ---------------
			 APPLY SIZE ENTRIES
			--------------- */

			function reloadSquare()
			{ changeX(); changeY(); }

				// WIDTH
				function changeX()
				{
					// Hide use intructions
					document.getElementById("instructions").style.display = "none";
					// Apply the new size if valid entry
					var xVal = document.getElementById("xVal").value;
					if(xVal % .01 !== 0) { // If float
						if(cScreen.preferredUnit === "cm")
							document.getElementById("square").style.width = realCm(xVal);
						else
							document.getElementById("square").style.width = realInch(xVal);
					}
				}

				// HEIGHT
				function changeY()
				{
					// Hide use intructions
					document.getElementById("instructions").style.display = "none";
					// Apply the new size if valid entry
					var yVal = document.getElementById("yVal").value;
					if(yVal % .01 !== 0) { // If float
						if(cScreen.preferredUnit === "cm")
							document.getElementById("square").style.height = realCm(yVal);
						else
							document.getElementById("square").style.height = realInch(yVal);
					}
				}


/*  =========================================================================
	 MAIN
	========================================================================= */

	document.addEventListener('DOMContentLoaded', function(event)
	{
		/*  ----------------------------------------
			 CANVAS FRAME
			---------------------------------------- */

			var canvas = document.getElementById("frame-1");
			var ctx = canvas.getContext("2d");
			ctx.fillStyle = "#2b2b2b";
			ctx.fillRect(0,0,12,150);
			ctx.fillRect(0,0,150,12);

			canvas = document.getElementById("frame-2");
			ctx = canvas.getContext("2d");
			ctx.fillStyle = "#2b2b2b";
			ctx.fillRect(150,0,-12,150);
			ctx.fillRect(150,0,-150,12);

			canvas = document.getElementById("frame-3");
			ctx = canvas.getContext("2d");
			ctx.fillStyle = "#2b2b2b";
			ctx.fillRect(150,150,-12,-150);
			ctx.fillRect(150,150,-150,-12);

			canvas = document.getElementById("frame-4");
			ctx = canvas.getContext("2d");
			ctx.fillStyle = "#2b2b2b";
			ctx.fillRect(0,150,12,-150);
			ctx.fillRect(150,150,-150,-12);


		/*  ----------------------------------------
			 DEVICE DETECTION
			---------------------------------------- */

			deviceRetrieval();
			// SCREEN CHANGE LIVE DETECTION
			setInterval(function(){
				//var t = window.screen.width * window.devicePixelRatio;
				 // if screen change and currently not calibrating
				if( ( (window.screen.width * window.devicePixelRatio != cScreen.wRes && window.screen.width * window.devicePixelRatio != cScreen.hRes) || (window.screen.height * window.devicePixelRatio != cScreen.wRes && window.screen.height * window.devicePixelRatio != cScreen.hRes) ) && screen.calibrationStatus != -1) {
					cScreen = new Screen();
					deviceRetrieval();
					console.log((window.screen.width * window.devicePixelRatio) + " - " + cScreen.wRes);
					changeSizeUnit();
					screenSizeButtonsGeneration();
					calibrationObjectsListGeneration();
					changeCalibrationObject();

					// DEVICE DATA DISPLAY
					document.getElementById("deviceName").textContent = cScreen.name;
					document.getElementById("deviceScreenSize").textContent = cScreen.diagonal.toFixed(1) + " inch.";
					document.getElementById("deviceResolution").textContent = Math.round(cScreen.wRes) + " x " + Math.round(cScreen.hRes); 
				}
			}, 300);



			


			// INIT

			changeSizeUnit(); // update the unit depending on the potential browser auto-completion
			screenSizeButtonsGeneration();
			calibrationObjectsListGeneration();

			// Draw a first frame based on the preferred calibration object (or the top listed one (credit card))
			/*
			
			*/

			// First square dimensions : the preferred calibration object
			changeCalibrationObject();


			// DEVICE DATA DISPLAY
			document.getElementById("deviceName").textContent = cScreen.name;
			document.getElementById("deviceScreenSize").textContent = cScreen.diagonal.toFixed(1) + " inch.";
			document.getElementById("deviceResolution").textContent = Math.round(cScreen.wRes) + " x " + Math.round(cScreen.hRes); 
	});




/*

- Green
	- Self-calibrated (regogniside device with 100% confidence or already manually calibrated)
	- Calibrated screen (already calibrated by the user)
- Orange
	- Probably self-calibrated (recongisized device with a doubt or possbile confusion)
	- Approximately self-calibrated (if device type of family only)
- Red
	- Poorly self-calibrated (lack of informations to have a good assumption)
	- Not calibrated (not even possible to try a preset)


*/