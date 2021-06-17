/*  =========================================================================
	 OBJECT MODEL
	========================================================================= */

	/*  ----------------------------------------
		 APP CONST
		---------------------------------------- */

		var builtInScreenAlreadyFound = false;

		// Fullscreen
		var fullscreenAvailable = true; // useless unless we want to prevent display useless buttons on pwa

	/*  ----------------------------------------
		 APP PREFERENCES
		---------------------------------------- */

		class AppPreferences
		{
			constructor() {
				this.preferredUnit = "cm";
				this.theme = "auto";
				this.fullscreenStatus = false;
				this.showGraduations = true;
			}
		}

		var app = new AppPreferences();

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
	 DATA
	========================================================================= */

	/*  ----------------------------------------
		 POSSIBLE RESOLUTIONS
		---------------------------------------- */

	var lResolutions = [5, 5.5, 6, 6.5, 7, 8, 9, 9.7, 10.1, 11.6, 13.3, 14, 15.6, 17.3, 19, 21.5, 24, 27, 32, 49];

	/*  ----------------------------------------
		 CALIBRATION OBJECTS
		---------------------------------------- */

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
				generatedButtons += '<button onmousedown="changeResolution(' + lResolutions[i] + ')" >' + lResolutions[i] + '"' + '</button>';
			}
			generatedButtons += "<input id=\"customResolution\" autocomplete=\"off\" placeholder='X.XX\"' onchange='changeResolution(this.value)'/>";
			document.getElementById("screenSizeButtons").innerHTML = generatedButtons;
		}

		function calibrationObjectsListGeneration()
		{
			let generatedSelect = "";
			for(var i=0 ; i<lcalibObjects.length ; i++) {
				generatedSelect += "<option value='" + i + "'>" + lcalibObjects[i].name + "</option>";//'<button onmousedown="changeResolution(' + lResolutions[i] + ')" >' + lResolutions[i] + '"' + '</button>';
			}
			document.getElementById("calibrationObjectsList").innerHTML = generatedSelect;
		}

	/*  ----------------------------------------
		 CALIBRATION MODES
		---------------------------------------- */

		/*  ---------------
			 DEVICE IDENTIFICATION
			--------------- */

			function deviceRetrieval()
			{
				var alreadyCalibrated = localSaveRead();
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
				}
				else
				{
					setCalibrationStatus(cScreen.calibrationStatus);
				}
			}

		/*  ---------------
			 CALIBRATION SAVE
			--------------- */

			function localSaveEdit()
			{
				let currentScreenIsNew = true;
				var i;
				for(i=0 ; i<localStorage.length; i++) {
					var key = localStorage.key(i);
					var value = JSON.parse(localStorage[key]);
					if(key.includes("screen"))
					{
						console.log("SAVE EDIT : " + key + " => " + value.name);
						// TODO : SEEMS UNABLE TO DETECT ROTATED SCREEN
						if(value.wRes == cScreen.wRes || value.hRes == cScreen.hRes)
						{
							localStorage.setItem(key, JSON.stringify(cScreen));
							currentScreenIsNew = false;
						}
					}
				}
				if (currentScreenIsNew === true)
				{
					localStorage.setItem("screen " + i, JSON.stringify(cScreen));
				}
				updateScreenDisplay();
			}

				function appSaveEdit()
				{
					var i;
					var hasAppData = false;
					for(i=0 ; i<localStorage.length; i++) {
						var key = localStorage.key(i);
						var value = JSON.parse(localStorage[key]);
						if(key.includes("appData"))
						{
							hasAppData = true;
							console.log("SAVE EDIT : " + key + " => " + value.name);
							localStorage.setItem(key, JSON.stringify(app));
						}
					}
					if(hasAppData === false) {
						localStorage.setItem("appData", JSON.stringify(app));
					}
				}

			function localSaveRead()
			{
				let currentScreenIsNew = true;
				var i;
				for(i=0 ; i<localStorage.length; i++) {
					var key = localStorage.key(i);
					var value = JSON.parse(localStorage[key]);
					if(key.includes("screen"))
					{
						console.log("SAVE READ : " + key + " => " + value.name);
						if (value.builtIn === true)
							builtInScreenAlreadyFound = true;
						// TODO : SEEMS UNABLE TO DETECT ROTATED SCREEN
						if( (value.wRes == cScreen.wRes || value.hRes == cScreen.wRes) && (value.wRes == cScreen.hRes || value.hRes == cScreen.hRes))
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
				}
				if (currentScreenIsNew === true)
				{
					return -1;
				}
				updateScreenDisplay();
			}

				function appSaveRead()
				{
					var i;
					for(i=0 ; i<localStorage.length; i++) {
						var key = localStorage.key(i);
						var value = JSON.parse(localStorage[key]);
						if(key.includes("appData"))
						{
							// INJECT THE CALIBRATION DATA IN THE APP
							try {
								app.preferredUnit = value.preferredUnit;
								app.theme = value.theme;
								app.fullscreenStatus = value.fullscreenStatus;
								app.showGraduations = value.showGraduations;
								return 1;
							}
							catch(e) {
								return -1;
							}
						}
					}
				}

			function localSaveRemove()
			{
				for(i=0 ; i<localStorage.length; i++) {
					var key = localStorage.key(i);
					if(key.includes("screen"))
						localStorage.removeItem(key);
				}
			}


				function resetCalibration()
				{
					localSaveRemove();
					//document.location.reload();
					builtInScreenAlreadyFound = false;
					deviceFoundProcedure();
					setCalibrationStatus(cScreen.calibrationStatus);
					updateScreenDisplay();
					document.getElementById("userPreferences").style.display = "none";
				}

			function resetAppData()
			{ localStorage.clear(); }

				function resetApp()
				{
					resetAppData()
					document.location.reload();
				}

		/*  ---------------
			 STATUS
			--------------- */

			function confirmCalibration()
			{
				setCalibrationStatus(3);
				cScreen.confirmedCalibration = true;
				localSaveEdit();
			}

			function setCalibrationStatus(s)
			{
				let warningMsg = "<h1>check your screen calibration (confirm your model or verify the frame fits a credit card)</h1><h1>else, proceed manual calibration</h1>";
				let basicInstructionMsg = "<h1>enter a width and an height to change my size</h1>";

				// USER-CALIBRATED
				if (s === 4) {
					cScreen.calibrationStatus = 4;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/valid-icon.svg");
					cScreen.name = "user-calibrated screen";
					document.getElementById("calibrationStatus").innerHTML = cScreen.name;
					document.getElementById("deviceName").textContent = cScreen.name;
					document.getElementById("confirm-calibration-button").style.display = "none";
					document.getElementById("calibrationTools").style.display = "none";
					document.getElementById("calibration-zoom").style.display = "none";
					//document.getElementById("calibration-button").style.display = "none";
					document.getElementById("input-form").style.display = "block";
					document.getElementById("instructions").innerHTML = basicInstructionMsg;
					document.getElementById("instructions").style.display = "block";
					localSaveEdit();
				}
				// SELF-CALIBRATED (highest confidence indice)
				if (s === 3) {
					cScreen.calibrationStatus = 3;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/valid-icon.svg");
					document.getElementById("calibrationStatus").innerHTML = "self-calibrated";
					document.getElementById("confirm-calibration-button").style.display = "none";
					document.getElementById("calibrationTools").style.display = "none";
					document.getElementById("calibration-zoom").style.display = "none";
					document.getElementById("reset-button").style.display = "none";
					//document.getElementById("calibration-button").style.display = "none";
					document.getElementById("calibration-button").textContent = "manual calibration";
					document.getElementById("calibration-button").setAttribute("onclick","calibrationModeOn();");
					document.getElementById("input-form").style.display = "block";
					document.getElementById("instructions").innerHTML = basicInstructionMsg;
					document.getElementById("instructions").style.display = "block";
					localSaveEdit();
				}
				// PROBABLY SELF-CALIBRATED (doubt or possible confusion)
				else if (s === 2) {
					cScreen.calibrationStatus = 2;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/approximation-icon-v2.svg");
					document.getElementById("calibrationStatus").innerHTML = "probably self-calibrated";
					document.getElementById("confirm-calibration-button").style.display = "none";
					document.getElementById("calibrationTools").style.display = "none";
					document.getElementById("calibration-zoom").style.display = "none";
					document.getElementById("reset-button").style.display = "none";
					//document.getElementById("calibration-button").style.display = "none";
					document.getElementById("confirm-calibration-button").style.display = "inline-block";
					document.getElementById("input-form").style.display = "block";
					document.getElementById("instructions").innerHTML = warningMsg + basicInstructionMsg;
					document.getElementById("instructions").style.display = "block";
				}
				// POORLY SELF-CALIBRATED (best-effort despite the lack of model detection)
				else if (s === 1) {
					cScreen.calibrationStatus = 1;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/warning-icon.svg");
					document.getElementById("calibrationStatus").innerHTML = "poorly self-calibrated";
					document.getElementById("confirm-calibration-button").style.display = "none";
					document.getElementById("calibrationTools").style.display = "none";
					document.getElementById("calibration-zoom").style.display = "none";
					document.getElementById("reset-button").style.display = "none";
					//document.getElementById("calibration-button").style.display = "none";
					document.getElementById("confirm-calibration-button").style.display = "inline-block";
					document.getElementById("input-form").style.display = "block";
					document.getElementById("instructions").innerHTML = warningMsg + basicInstructionMsg;
					document.getElementById("instructions").style.display = "block";
				}
				// NOT CALIBRATED (too unsure to presume anything of complete lack of usable data)
				else if (s === 0) {
					cScreen.calibrationStatus = 0;
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/unknown-error-icon-v2.svg");
					document.getElementById("calibrationStatus").innerHTML = "not calibrated";
					document.getElementById("confirm-calibration-button").style.display = "none";
					document.getElementById("calibrationTools").style.display = "none";
					document.getElementById("calibration-zoom").style.display = "none";
					document.getElementById("reset-button").style.display = "none";
					//document.getElementById("calibration-button").style.display = "none";
					document.getElementById("confirm-calibration-button").style.display = "inline-block";
					document.getElementById("input-form").style.display = "block";
					document.getElementById("instructions").innerHTML = warningMsg + basicInstructionMsg;
					document.getElementById("instructions").style.display = "block";
				}
				// MANUAL CALIBRATING NOW
				else if (s === -1) {
					document.getElementById("calibrationStatus").textContent = "manual calibration";
					document.getElementById("deviceName").textContent = "manual calibration";
					document.getElementById("calibrationIconImg").setAttribute("src", "rsrc/img/calibration-icon.svg");
					document.getElementById("confirm-calibration-button").style.display = "none";
					document.getElementById("reset-button").style.display = "block";
					document.getElementById("instructions").innerHTML = basicInstructionMsg;
				}
				localSaveEdit(); // TODO : usefull ?
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
				// return to the asked size
				reloadSquare();
				// Save calibration
				localSaveEdit();
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
				localSaveEdit();
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
				updateGraduations();
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
				updateGraduations();
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
				updateGraduations();
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
				// 
				updateGraduations();
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
				updateGraduations();

			}

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


	/*  ----------------------------------------
		 FULLSCREEN MODE
		---------------------------------------- */

		function goFullScreen()
		{
			app.fullscreenStatus = true;
			// Go fullscreen
			var body = document.getElementsByTagName("body")[0];
			body.requestFullscreen();
			// Fullscreen button evolves into end fullscreen button
			document.getElementById("fullscreen-button").getElementsByTagName("img")[0].setAttribute("src", "rsrc/img/fullscreen-end-icon.svg");
			document.getElementById("fullscreen-button").setAttribute("onmousedown", "endFullScreen();");
		}

		function endFullScreen()
		{
			// End fullscreen
			document.exitFullscreen();
			// End fullscreen button evolves into fullscreen button
			document.getElementById("fullscreen-button").getElementsByTagName("img")[0].setAttribute("src", "rsrc/img/fullscreen-icon.svg");
			document.getElementById("fullscreen-button").setAttribute("onmousedown", "goFullScreen();");
			app.fullscreenStatus = false;
		}

	/*  ----------------------------------------
		 USER PREFERENCES
		---------------------------------------- */

		/*  ---------------
			 ON / OFF 
			--------------- */

			function goUserPreferences()
			{
				document.getElementById("instructions").style.display = "none";
				document.getElementById("userPreferences").style.display = "block";

				document.getElementById("square").style.width = "min(100vw - 60px, 70vw, 600px)";
				document.getElementById("square").style.height = "min(100vh - 60px, 70vh, 600px)";

				document.getElementById("app-settings-button").setAttribute("onmousedown", "endUserPreferences();");
			}

			function endUserPreferences()
			{
				document.getElementById("instructions").style.display = "block";
				document.getElementById("userPreferences").style.display = "none";

				changeCalibrationObject(); // load the last calibration in case no size has been entred by the user
				reloadSquare(); // load the last entry

				document.getElementById("app-settings-button").setAttribute("onmousedown", "goUserPreferences();");

				// TODO : missing instructions
			}


		/*  ---------------
			 GENERATION
			--------------- */

			function generatePreference() {
				if(appSaveRead() > 0) {
					document.getElementById("preferredUnit").value = app.preferredUnit;
					document.getElementById("sizeUnit").value = app.preferredUnit;
				}
			}

		/*  ---------------
			 DARK MODE
			--------------- */

			function setDarkMode()
			{
				app.theme = "dark";
				document.getElementsByTagName("body")[0].classList.add("dark");

				drawFrame();

				document.getElementById("dark-mode-button").classList.add("selected");
				document.getElementById("light-mode-button").classList.remove("selected");
				document.getElementById("auto-mode-button").classList.remove("selected");

				app.theme = "dark";
				appSaveEdit();
			}

			function setLightMode()
			{
				app.theme = "light";
				document.getElementsByTagName("body")[0].classList.remove("dark");

				drawFrame();

				document.getElementById("light-mode-button").classList.add("selected");
				document.getElementById("dark-mode-button").classList.remove("selected");
				document.getElementById("auto-mode-button").classList.remove("selected");

				app.theme = "light";
				appSaveEdit();
			}

			function setAutoMode()
			{
				app.theme = "auto";
				if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
					console.log('Dark mode is supported');
					if (window.matchMedia('(prefers-color-scheme: dark)').matches === true) {
						document.getElementsByTagName("body")[0].classList.add("dark");
						console.log('auto dark mode');
					}
					else {
						document.getElementsByTagName("body")[0].classList.remove("dark");
						console.log('auto light mode');
					}
				}

				drawFrame();

				document.getElementById("auto-mode-button").classList.add("selected");
				document.getElementById("dark-mode-button").classList.remove("selected");
				document.getElementById("light-mode-button").classList.remove("selected");

				app.theme = "auto";
				appSaveEdit();
			}

		/*  ---------------
			 PREFERRED UNIT
			--------------- */

			function setPreferredUnit()
			{
				let sUnit = document.getElementById("preferredUnit").value;
				if(sUnit === "cm")
					app.preferredUnit = "cm";
				else if(sUnit === "inches")
					app.preferredUnit = "inches";
				else
					console.log("ERROR : unknown size unit (not cm, not inches)");
				document.getElementById("sizeUnit").value = app.preferredUnit;
				cScreen.preferredUnit = app.preferredUnit;
				appSaveEdit();
				updateGraduations();
			}


		/*  ---------------
			 GRADUATIONS
			--------------- */

			function removeGraduations()
			{
				/*document.getElementById("graduation-button").setAttribute("onmousedown", "addGraduations();");
				document.getElementById("graduation-button").innerHTML = "display graduations";*/

				app.showGraduations = false;

				updateGraduations();
				
				appSaveEdit();
			}

			function addGraduations()
			{
				/*document.getElementById("graduation-button").setAttribute("onmousedown", "removeGraduations();");
				document.getElementById("graduation-button").innerHTML = "hide graduations";*/

				app.showGraduations = true;

				updateGraduations();
				
				appSaveEdit();
			}

		/*  ---------------
			 SCREEN LIST UPDATE
			--------------- */

			function updateScreenDisplay()
			{
				// <b>screen 1</b> : <span>model</span> (<span>15.4 inch.</span> - <span>1080</span> x <span>1920</span>)
				console.log("UPDATE SCREEN LIST DISPLAY");
				var listHTML = "";//"<p>";
				var i;
				for(i=0 ; i<localStorage.length; i++) {
					var key = localStorage.key(i);
					var value = JSON.parse(localStorage[key]);
					if(i>0)
						listHTML += "<br/>";
					if(key.includes("screen")) {
						console.log("PREF LIST : " + key + " => " + value.name);
						listHTML += "<b>screen " + i + "</b> : " + value.name + " (" + value.diagonal.toFixed(1) + " inch. - " + value.wRes + "x" + value.hRes + ")"; 
					}
				}
				document.getElementById("screen-list").innerHTML = listHTML;
			}

/*  =========================================================================
	 MAIN UTILITIES
	========================================================================= */

	function deviceFoundProcedure()
	{
		// GET THE DEVICE (saved configuration or detection)
		deviceRetrieval();
		console.log((window.screen.width * window.devicePixelRatio) + " - " + cScreen.wRes);

		// INTERFACE GENERATION BASED ON CONFIGURATION
		changeSizeUnit(); // update the unit depending on the potential browser auto-completion
		screenSizeButtonsGeneration();
		calibrationObjectsListGeneration();
			// First square dimensions : the preferred calibration object
		changeCalibrationObject();

		// DISPLAY DEVICE DATA
		document.getElementById("deviceName").textContent = cScreen.name;
		document.getElementById("deviceScreenSize").textContent = cScreen.diagonal.toFixed(1) + " inch.";
		document.getElementById("deviceResolution").textContent = Math.round(cScreen.wRes) + " x " + Math.round(cScreen.hRes); 
	}

	function drawFrame()
	{
		let canvasColor = "#2b2b2b";
		// IF THE BROWSER SUPPORTS DARK MODE AND AUTO THEME
		if(app.theme === "auto") {
			if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
				console.log('🎉 Dark mode is supported');
				if (window.matchMedia('(prefers-color-scheme: dark)').matches === true) {
					canvasColor = "Gainsboro";
				}
			}
		}
		else if(app.theme === "dark") {
			canvasColor = "Gainsboro";
		}

		var canvas = document.getElementById("frame-1");
		var ctx = canvas.getContext("2d");
		ctx.fillStyle = canvasColor;
		ctx.fillRect(0,0,12,150);
		ctx.fillRect(0,0,150,12);

		canvas = document.getElementById("frame-2");
		ctx = canvas.getContext("2d");
		ctx.fillStyle = canvasColor;
		ctx.fillRect(150,0,-12,150);
		ctx.fillRect(150,0,-150,12);

		canvas = document.getElementById("frame-3");
		ctx = canvas.getContext("2d");
		ctx.fillStyle = canvasColor;
		ctx.fillRect(150,150,-12,-150);
		ctx.fillRect(150,150,-150,-12);

		canvas = document.getElementById("frame-4");
		ctx = canvas.getContext("2d");
		ctx.fillStyle = canvasColor;
		ctx.fillRect(0,150,12,-150);
		ctx.fillRect(150,150,-150,-12);
	}

	function loadTheme(e)
	{
		const darkModeOn = e.matches;
		console.log(`Dark mode is ${darkModeOn ? '🌒 on' : '☀️ off'}.`);
		if(darkModeOn) {
			document.getElementsByTagName("body")[0].classList.add("dark");
		}
		else {
			document.getElementsByTagName("body")[0].classList.remove("dark");
		}
		// Canvas drawing
		drawFrame();
	}

	function updateGraduations()
	{
		if(app.showGraduations) {
			// Add graduations button
			document.getElementById("graduation-button").setAttribute("onmousedown", "removeGraduations();");
			document.getElementById("graduation-button").innerHTML = "hide graduations";
			// Display graduations depending on the unit
			if(cScreen.preferredUnit === "cm") {
				document.getElementById("graduations").style.width = realCm(500);
				document.getElementById("graduations-portrait").style.height = realCm(500);
				document.getElementById("graduations-inch").style.width = 0;
				document.getElementById("graduations-portrait-inch").style.height = 0;
			}
			else if (cScreen.preferredUnit === "inches") {
				document.getElementById("graduations-inch").style.width = realInch(500);
				document.getElementById("graduations-portrait-inch").style.height = realInch(500);
				document.getElementById("graduations").style.width = 0;
				document.getElementById("graduations-portrait").style.height = 0;
			}
		}
		else {
			// Add graduation button
			document.getElementById("graduation-button").setAttribute("onmousedown", "addGraduations();");
			document.getElementById("graduation-button").innerHTML = "display graduations";
			document.getElementById("graduations").style.width = 0;
			document.getElementById("graduations-portrait").style.height = 0;
			document.getElementById("graduations-inch").style.width = 0;
			document.getElementById("graduations-portrait-inch").style.height = 0;
		}
	}

/*  =========================================================================
	 MAIN
	========================================================================= */

	document.addEventListener('DOMContentLoaded', function(event)
	{
		/*  ----------------------------------------
			 CHECK IF PWA
			---------------------------------------- */

			/* does'nt work */
			/*if (window.matchMedia('(display-mode: standalone)').matches) {
				console.log("This is running as standalone.");
				goFullScreen();
			}*/



			// RETURN APP PREFERENCES
			//appSaveRead();
			generatePreference();

		/*  ----------------------------------------
			 CANVAS FRAME
			---------------------------------------- */

			if(app.theme === "auto") {
				// DARK MODE CHANGE LIVE UPDATE https://web.dev/prefers-color-scheme/
				const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
				darkModeMediaQuery.addListener((e) => {
					loadTheme(e);
				});

				setAutoMode();
			}
			else if(app.theme === "dark") {
				setDarkMode();
			}
			else if(app.theme === "light") {
				setLightMode();
			}

			//drawFrame();


		/*  ----------------------------------------
			 DEVICE DETECTION
			---------------------------------------- */

			deviceFoundProcedure();

			// SCREEN CHANGE LIVE DETECTION
			setInterval(function() {
				if(app.fullscreenStatus === false) {
					// IF SCREEN CHANGE (except rotations)
					if( ( (window.screen.width * window.devicePixelRatio != cScreen.wRes && window.screen.width * window.devicePixelRatio != cScreen.hRes) || (window.screen.height * window.devicePixelRatio != cScreen.wRes && window.screen.height * window.devicePixelRatio != cScreen.hRes) ) && screen.calibrationStatus != -1) {
						cScreen = new Screen();
						deviceFoundProcedure();
					}
				}
			}, 300);




			// SVG loading
			//preserveAspectRatio="xMinYMin meet" -> required in the graduations svg, add manually after illustrator export
			//
			updateGraduations();
	});




