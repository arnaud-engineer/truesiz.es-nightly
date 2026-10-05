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
				this.ppi = "";
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
		new CalibrationObjects("A4 sheet portrait", 21, 29.7),
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
		 PPI CALCULATION
		---------------------------------------- */

		function ppiCalculation()
		{
			let diagonalInPixels = Math.sqrt(Math.pow(cScreen.hRes, 2) + Math.pow(cScreen.wRes, 2)); // Pythagoras
			let wResInches = cScreen.wRes * cScreen.diagonal / diagonalInPixels;// cross-multiplication
			let ppi = cScreen.wRes / wResInches;
			return ppi;
		}

		function ppcmCalculation()
		{
		    return ppiCalculation() / 2.54;
		}


	/*  ----------------------------------------
		 REAL UNITS
		---------------------------------------- */

		function realInch(x=1)
		{
		    return x * 2.54 * TrueSizes.q() + 'px';
		}

		function realCm(x=1)
		{
		    return x * TrueSizes.q() + 'px';
		}


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
				generatedButtons += '<button onclick="changeResolution(' + lResolutions[i] + ')" >' + lResolutions[i] + '"' + '</button>';
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
			    return TrueSizes.detect();
			}

		/*  ---------------
			 CALIBRATION SAVE
			--------------- */

			function localSaveEdit()
			{
			    return TrueSizes.saveProfile();
			}

				function appSaveEdit()
				{
				    return TrueSizes.savePreferences();
				}

			function localSaveRead()
			{
			    return TrueSizes.restore();
			}

				function appSaveRead()
				{
				    return TrueSizes.readPreferences();
				}

			function localSaveRemove()
			{
			    return TrueSizes.resetCalibration();
			}


				function resetCalibration()
				{
				    return TrueSizes.resetCalibration();
				}

			function resetAppData()
			{
			    return TrueSizes.resetAppData();
			}

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
			    return TrueSizes.begin();
			}

			function setCalibrationStatus(s)
			{
			    return TrueSizes.status();
			}

		/*  ---------------
			 ON / OFF
			--------------- */

			function calibrationModeOn()
			{
			    return TrueSizes.begin();
			}

			function calibrationModeOff()
			{
			    return TrueSizes.finish();
			}


		/*  ---------------
			 WITH AN OBJECT
			--------------- */

			function changeCalibrationObject()
			{
			    return TrueSizes.changeReference();
			}

			function changeResolutionOnScroll(event)
			{
			    return TrueSizes.wheel(event);
			}

			function changeResolutionOnKeyPress(event)
			{
			    return TrueSizes.key(event);
			}

			function changeResolutionOnButton(event)
			{
			    return TrueSizes.adjust(event === '+' ? 1.01 : 1 / 1.01);
			}


		/*  ---------------
			 WITH SIZE SCREEN
			--------------- */

			function changeResolution(res)
			{
			    return TrueSizes.chooseDiagonal(res);
			}


	/*  ----------------------------------------
		 FRAME SIZE UPDATE UTILITIES
		---------------------------------------- */

		/*  ---------------
			 CHANGES SIZE UNITS
			--------------- */

			function changeSizeUnit()
			{
			    return TrueSizes.changeUnit();
			}

		/*  ---------------
			 APPLY SIZE ENTRIES
			--------------- */

			function reloadSquare()
			{
			    return TrueSizes.renderObject();
			}

				// WIDTH
				function changeX()
				{
				    return TrueSizes.editObject();
				}

				// HEIGHT
				function changeY()
				{
				    return TrueSizes.editObject();
				}


	/*  ----------------------------------------
		 FULLSCREEN MODE
		---------------------------------------- */

		function goFullScreen()
		{
		    return TrueSizes.fullscreen();
		}

		function endFullScreen()
		{
		    return TrueSizes.fullscreen();
		}

	/*  ----------------------------------------
		 USER PREFERENCES
		---------------------------------------- */

		/*  ---------------
			 ON / OFF 
			--------------- */

			function goUserPreferences()
			{
			    return TrueSizes.openPreferences();
			}

			function endUserPreferences()
			{
			    return TrueSizes.closePreferences();
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
			    app.preferredUnit = document.getElementById('preferredUnit').value;
                document.getElementById('sizeUnit').value = app.preferredUnit;
                changeSizeUnit(); appSaveEdit();
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
			    return TrueSizes.updateProfiles();
			}

/*  =========================================================================
	 MAIN UTILITIES
	========================================================================= */

	function deviceFoundProcedure()
	{
	    return TrueSizes.initialize();
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
	    if (app.theme !== 'auto') return;
        document.body.classList.toggle('dark', e.matches); drawFrame();
	}

	function updateGraduations()
	{
		if(app.showGraduations) {
			// Add graduations button
				document.getElementById("graduation-button").setAttribute("onclick", "removeGraduations();");
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
				document.getElementById("graduation-button").setAttribute("onclick", "addGraduations();");
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
				// Theme listener is installed once by the historical UI adapter.

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

			// Mapping changes are monitored without erasing machine identity.




			// SVG loading
			//preserveAspectRatio="xMinYMin meet" -> required in the graduations svg, add manually after illustrator export
			//
			updateGraduations();
	});

