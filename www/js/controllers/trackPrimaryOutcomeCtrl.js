angular.module('starter')

    // Controls the Track Page of the App
    .controller('TrackPrimaryOutcomeCtrl', function($scope, $state, $timeout, $rootScope, $ionicLoading, quantimodoService,
                                                    $stateParams) {
        $scope.controller_name = "TrackPrimaryOutcomeCtrl";
        $scope.state = {};
        $rootScope.showFilterBarSearchIcon = false;
        //$scope.showCharts = false;
        $scope.showRatingFaces = true;
        // flags
        $scope.timeRemaining = false;
        $scope.averagePrimaryOutcomeVariableImage = false;
        $scope.averagePrimaryOutcomeVariableValue = false;
        $scope.showRatingFaces = true;
        var syncDisplayText = 'Syncing ' + config.appSettings.primaryOutcomeVariableDetails.name + ' measurements...';

        $scope.storeRatingLocalAndServerAndUpdateCharts = function (numericRatingValue) {

            // flag for blink effect
            $scope.timeRemaining = true;
            $scope.showRatingFaces = false;

            if (window.chrome && window.chrome.browserAction) {
                chrome.browserAction.setBadgeText({
                    text: ""
                });
            }

            //  add to measurementsQueue
            var primaryOutcomeMeasurement = quantimodoService.createPrimaryOutcomeMeasurement(numericRatingValue);
            quantimodoService.addToMeasurementsQueue(primaryOutcomeMeasurement);
            updateCharts();

            if(!$rootScope.isSyncing && $rootScope.user){
                $scope.showLoader(syncDisplayText);
                quantimodoService.syncPrimaryOutcomeVariableMeasurements().then(function(){
                    updateCharts();
                    $ionicLoading.hide();
                });
            }
           
        };

        var updateAveragePrimaryOutcomeRatingView = function(){
            var sum = 0;
            for (var j = 0; j <  $scope.state.primaryOutcomeMeasurements.length; j++) {
                sum += $scope.state.primaryOutcomeMeasurements[j].value;
            }
            $scope.averagePrimaryOutcomeVariableValue = Math.round(sum / $scope.state.primaryOutcomeMeasurements.length);

            $scope.averagePrimaryOutcomeVariableText =
                config.appSettings.ratingValueToTextConversionDataSet[$scope.averagePrimaryOutcomeVariableValue ];
            if($scope.averagePrimaryOutcomeVariableText){
                $scope.averagePrimaryOutcomeVariableImage = quantimodoService.getRatingFaceImageByText($scope.averagePrimaryOutcomeVariableText);
            }
            $scope.highchartsReflow();
        };

        var updateCharts = function(){
            $scope.state.primaryOutcomeMeasurements = quantimodoService.getLocalStorageItemAsObject('allMeasurements');
            var measurementsQueue = quantimodoService.getLocalStorageItemAsObject('measurementsQueue');
            if(!$scope.state.primaryOutcomeMeasurements){
                $scope.state.primaryOutcomeMeasurements = [];
            }
            if(measurementsQueue){
                $scope.state.primaryOutcomeMeasurements =  $scope.state.primaryOutcomeMeasurements.concat(measurementsQueue);
            }
            if( $scope.state.primaryOutcomeMeasurements) {
                $scope.hourlyChartConfig =
                    quantimodoService.processDataAndConfigureHourlyChart( $scope.state.primaryOutcomeMeasurements,
                        config.appSettings.primaryOutcomeVariableDetails);
                $scope.weekdayChartConfig =
                    quantimodoService.processDataAndConfigureWeekdayChart($scope.state.primaryOutcomeMeasurements,
                        config.appSettings.primaryOutcomeVariableDetails);
                $scope.distributionChartConfig =
                    quantimodoService.processDataAndConfigureDistributionChart( $scope.state.primaryOutcomeMeasurements,
                        config.appSettings.primaryOutcomeVariableDetails);
                updateAveragePrimaryOutcomeRatingView();
                $scope.lineChartConfig =
                    quantimodoService.processDataAndConfigureLineChart( $scope.state.primaryOutcomeMeasurements,
                        config.appSettings.primaryOutcomeVariableDetails);
            }
            $scope.highchartsReflow();
        };


        $scope.init = function(){
            $ionicLoading.hide();
            console.debug($state.current.name + ' initializing...');
            $rootScope.stateParams = $stateParams;
            if (typeof Bugsnag !== "undefined") { Bugsnag.context = $state.current.name; }
            if (typeof analytics !== 'undefined')  { analytics.trackView($state.current.name); }

            updateCharts();
            $scope.showRatingFaces = true;
            $scope.timeRemaining = false;
            if($rootScope.user || $rootScope.accessToken){
                $scope.showLoader(syncDisplayText);
                console.debug($state.current.name + ' going to syncPrimaryOutcomeVariableMeasurements');
                quantimodoService.syncPrimaryOutcomeVariableMeasurements().then(function(){
                    updateCharts();
                    $ionicLoading.hide();
                });
            } else {
                console.debug($state.current.name + ' has no user or access token so we cannot syncPrimaryOutcomeVariableMeasurements');
            }
        };

        $scope.$on('updateCharts', function(){
            console.debug('updateCharts broadcast received..');
            updateCharts();
        });

        $scope.$on('$ionicView.enter', function(e) { console.debug("Entering state " + $state.current.name);
            console.debug('$ionicView.enter. Updating charts and syncing..');
            $scope.init();
        });
    });