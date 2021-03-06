angular.module('starter')

    .controller('TagAddCtrl', function($scope, $q, $timeout, $state, $rootScope, $stateParams, $filter,
                                               $ionicActionSheet, $ionicHistory, $ionicLoading, quantimodoService) {

        $scope.controller_name = "TagAddCtrl";

        $scope.state = { };

        // cancel activity
        $scope.cancel = function(){
            $ionicHistory.goBack();
        };

        var goBack = function () {
            $ionicLoading.hide();
            if($stateParams.fromState){
                $state.go($stateParams.fromState, {variableObject: $stateParams.fromStateParams.variableObject});
            } else {
                $state.go(config.appSettings.defaultState);
            }
        };

        // delete measurement
        $scope.deleteTag = function(){
            var userTagData = {
                tagVariableId: $rootScope.stateParams.tagVariableObject.id,
                taggedVariableId: $rootScope.stateParams.taggedVariableObject.id
            };
            $ionicLoading.show({ template: '<ion-spinner></ion-spinner>' });

            if($stateParams.taggedVariableObject.userTagVariables){
                $rootScope.variableObject.userTagVariables =
                    $rootScope.variableObject.userTagVariables.filter(function( obj ) {
                        return obj.id !== $rootScope.stateParams.tagVariableObject.id;
                    });
            }

            if($stateParams.taggedVariableObject.userTaggedVariables){
                $rootScope.variableObject.userTaggedVariables =
                    $rootScope.variableObject.userTaggedVariables.filter(function( obj ) {
                        return obj.id !== $rootScope.stateParams.taggedVariableObject.id;
                    });
            }

            quantimodoService.deleteUserTagDeferred(userTagData).then(function () {
                goBack();
            }, function (error) {
                console.error(error);
                goBack();
            });
        };

        $scope.done = function(){

            if(!$rootScope.stateParams.tagConversionFactor){
                $rootScope.stateParams.tagConversionFactor = 1;
            }
            var userTagData = {
                tagVariableId: $rootScope.stateParams.tagVariableObject.id,
                taggedVariableId: $rootScope.stateParams.taggedVariableObject.id,
                conversionFactor: $rootScope.stateParams.tagConversionFactor
            };

            if($stateParams.fromStateParams.variableObject.id === $rootScope.stateParams.tagVariableObject.id){
                $rootScope.stateParams.taggedVariableObject.tagConversionFactor = $rootScope.stateParams.tagConversionFactor;
                $rootScope.stateParams.taggedVariableObject.tagDisplayText = $rootScope.stateParams.tagConversionFactor +
                    ' ' + $rootScope.stateParams.tagVariableObject.unitName + ' of ' +
                    $rootScope.stateParams.tagVariableObject.name + ' per ' +
                    $rootScope.stateParams.taggedVariableObject.unitName + ' of ' +
                    $rootScope.stateParams.taggedVariableObject.name;
                if(!$stateParams.fromStateParams.variableObject.userTaggedVariables){
                    $stateParams.fromStateParams.variableObject.userTaggedVariables = [];
                }
                $stateParams.fromStateParams.variableObject.userTaggedVariables.push($rootScope.stateParams.taggedVariableObject);
            }

            if($stateParams.fromStateParams.variableObject.id === $rootScope.stateParams.taggedVariableObject.id){
                $rootScope.stateParams.tagVariableObject.tagConversionFactor = $rootScope.stateParams.tagConversionFactor;
                $rootScope.stateParams.tagVariableObject.tagDisplayText = $rootScope.stateParams.tagConversionFactor +
                    ' ' + $rootScope.stateParams.tagVariableObject.unitName + ' of ' +
                    $rootScope.stateParams.tagVariableObject.name + ' per ' +
                    $rootScope.stateParams.taggedVariableObject.unitName + ' of ' +
                    $rootScope.stateParams.taggedVariableObject.name;
                if(!$stateParams.fromStateParams.variableObject.userTagVariables){
                    $stateParams.fromStateParams.variableObject.userTagVariables = [];
                }
                $stateParams.fromStateParams.variableObject.userTagVariables.push($rootScope.stateParams.tagVariableObject);
            }

            $ionicLoading.show({ template: '<ion-spinner></ion-spinner>' });

            quantimodoService.postUserTagDeferred(userTagData).then(function () {
                goBack();
            }, function (error) {
                console.error(error);
                goBack();
            });
        };

        // update data when view is navigated to
        $scope.$on('$ionicView.enter', function(e) {
            console.debug("$ionicView.enter " + $state.current.name);
            if (typeof Bugsnag !== "undefined") { Bugsnag.context = $state.current.name; }
            if (typeof analytics !== 'undefined')  { analytics.trackView($state.current.name); }
        });

        $scope.$on('$ionicView.beforeEnter', function(){
            $scope.state.title = 'Record a Tag';
            $rootScope.stateParams = $stateParams;
            if(!$rootScope.stateParams.tagVariableObject){
                $ionicLoading.show({
                    template: '<ion-spinner></ion-spinner>'
                });
                quantimodoService.getVariablesByNameDeferred('Anxiety').then(function (variable) {
                    $rootScope.stateParams.tagVariableObject = variable;
                    $ionicLoading.hide();
                });
            }

            if(!$rootScope.stateParams.taggedVariableObject){
                $ionicLoading.show({
                    template: '<ion-spinner></ion-spinner>'
                });
                quantimodoService.getVariablesByNameDeferred('Overall Mood').then(function (variable) {
                    $rootScope.stateParams.taggedVariableObject = variable;
                    $ionicLoading.hide();
                });
            }
            console.debug($state.current.name + ": beforeEnter");

        });

    });