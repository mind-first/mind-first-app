angular.module('starter')
	// Measurement Service
    .factory('migrationService', function($http, $q, QuantiModo, localStorageService, measurementService, $rootScope){


        // service methods
		var migrationService = {
			// get public variables
			version1466 : function(){
                var storedVersion = localStorageService.getItemAsObject('appMigrationVersion');
                if (!$rootScope.user && !storedVersion) {
                    localStorageService.setItem('appMigrationVersion', 1489);
                }
                else if (storedVersion < 1489){
                    console.debug('Running migration version version1489...');
                    localStorageService.getItem('primaryOutcomeVariableMeasurements',function(primaryOutcomeVariableMeasurements) {
                        if (typeof Bugsnag !== "undefined") {
                            Bugsnag.user = $rootScope.user;
                            Bugsnag.notify('Backing up user measurements', primaryOutcomeVariableMeasurements, {}, "error");
                        }
                        localStorageService.setItem('primaryOutcomeVariableMeasurementsBackup1489', primaryOutcomeVariableMeasurements);
                    });
                    localStorageService.deleteItem('primaryOutcomeVariableMeasurements');
                    localStorageService.deleteItem('lastPrimaryOutcomeVariableMeasurementsSyncTime');
                    measurementService.syncPrimaryOutcomeVariableMeasurements().then(function(){
                        console.debug("Measurement sync complete!");
                    });
                    localStorageService.setItem('appMigrationVersion', 1489);
                }
			}
		};

		return migrationService;
	});