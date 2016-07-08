angular.module('starter')
	// Measurement Service
	.factory('reminderService', function($http, $q, QuantiModo, timeService, notificationService, localStorageService){

		// service methods
		var reminderService = {

			addNewReminder : function(trackingReminder){
				
				var deferred = $q.defer();
				
                QuantiModo.postTrackingReminder(trackingReminder, function(){
					//update alarms and local notifications
					reminderService.getTrackingReminders();
                	deferred.resolve();
                }, function(err){
					Bugsnag.notify(err, JSON.stringify(err), {}, "error");
                	deferred.reject(err);
                });

				return deferred.promise;
			},

			skipReminderNotification : function(trackingReminderNotificationId){
				var deferred = $q.defer();

				localStorageService.deleteElementOfItemById('trackingReminderNotifications', trackingReminderNotificationId);

				QuantiModo.skipTrackingReminder(trackingReminderNotificationId, function(response){
					if(response.success) {
						deferred.resolve();
                    }
					else {
						deferred.reject();
					}
				}, function(err){
					Bugsnag.notify(err, JSON.stringify(err), {}, "error");
					deferred.reject(err);
				});
				
				return deferred.promise;
			},

			trackReminderNotification : function(trackingReminderNotificationId, modifiedReminderValue){
				var deferred = $q.defer();
				localStorageService.deleteElementOfItemById('trackingReminderNotifications', trackingReminderNotificationId);

				QuantiModo.trackTrackingReminder(trackingReminderNotificationId, modifiedReminderValue, function(response){
					if(response.success) {
						deferred.resolve();
					}
					else {
						deferred.reject();
					}
				}, function(err){
					Bugsnag.notify(err, JSON.stringify(err), {}, "error");
					deferred.reject(err);
				});
				
				return deferred.promise;
			},

			snoozeReminderNotification : function(trackingReminderNotificationId){
				var deferred = $q.defer();
				localStorageService.deleteElementOfItemById('trackingReminderNotifications', trackingReminderNotificationId);

				QuantiModo.snoozeTrackingReminder(trackingReminderNotificationId, function(response){
					if(response.success) {
						deferred.resolve();
                    }
					else {
						deferred.reject();
					}
				}, function(err){
					Bugsnag.notify(err, JSON.stringify(err), {}, "error");
					deferred.reject(err);
				});
				
				return deferred.promise;
			},

			getTrackingReminders : function(category, reminderId){

				var deferred = $q.defer();
				var params = typeof category !== "undefined" && category !== "" ? {variableCategoryName : category} : {};
				if(reminderId){
					params = {id : reminderId};
				}
				QuantiModo.getTrackingReminders(params, function(remindersResponse){
					var trackingReminders = remindersResponse.data;
					if(remindersResponse.success) {
						if(!category && !reminderId){
							notificationService.scheduleAllNotifications(trackingReminders);
							localStorageService.setItem('trackingReminders', JSON.stringify(trackingReminders));
						}
						deferred.resolve(trackingReminders);
					}
					else {
						deferred.reject("error");
					}
				}, function(err){
					Bugsnag.notify(err, JSON.stringify(err), {}, "error");
					deferred.reject(err);
				});

				return deferred.promise;
			},

			getTrackingReminderNotifications : function(category, today){

				var localMidnightInUtcString = timeService.getLocalMidnightInUtcString();
				var currentDateTimeInUtcString = timeService.getCurrentDateTimeInUtcString();
				var params = {};
				if(today && !category){
					var reminderTime = '(gt)' + localMidnightInUtcString;
					params = {
                        reminderTime : reminderTime,
                        sort : 'reminderTime'
                    };
				}

				if(!today && category){
					params = {
						variableCategoryName : category,
						reminderTime : '(lt)' + currentDateTimeInUtcString
					};
				}

				if(today && category){
					params = {
						reminderTime : '(gt)' + localMidnightInUtcString,
						variableCategoryName : category,
                        sort : 'reminderTime'
					};
				}

				if(!today && !category){
					params = {
						reminderTime : '(lt)' + currentDateTimeInUtcString
					};
				}

				var deferred = $q.defer();
				QuantiModo.getTrackingReminderNotifications(params, function(trackingReminderNotifications){
					if(trackingReminderNotifications.success) {
						if(!today && !category){
							localStorageService.setItem('trackingReminderNotifications', JSON.stringify(trackingReminderNotifications.data));
						}

						deferred.resolve(trackingReminderNotifications.data);
					}
					else {
						deferred.reject("error");
					}
				}, function(err){
					Bugsnag.notify(err, JSON.stringify(err), {}, "error");
					deferred.reject(err);
				});

				return deferred.promise;
			},

			deleteReminder : function(reminderId){
				var deferred = $q.defer();

				localStorageService.deleteElementOfItemById('trackingReminders', reminderId);

				QuantiModo.deleteTrackingReminder(reminderId, function(response){
					if(response.success) {
						//update alarms and local notifications
						reminderService.getTrackingReminders();
						deferred.resolve();
					}
					else {
						deferred.reject();
					}
				}, function(err){
					Bugsnag.notify(err, JSON.stringify(err), {}, "error");
					deferred.reject(err);
				});
				
				return deferred.promise;
			},
			
			addRatingTimesToDailyReminders : function(reminders) {
				var index;
				for (index = 0; index < reminders.length; ++index) {
					if (reminders[index].valueAndFrequencyTextDescription.indexOf('daily') > 0) {
						reminders[index].valueAndFrequencyTextDescription =
							reminders[index].valueAndFrequencyTextDescription + ' at ' +
							reminderService.convertReminderTimeStringToMoment(reminders[index].reminderStartTime).format("h:mm A");
					}
				}
				return reminders;
			},

			convertReminderTimeStringToMoment : function(reminderTimeString) {
				var now = new Date();
				var hourOffsetFromUtc = now.getTimezoneOffset()/60;
				var parsedReminderTimeUtc = reminderTimeString.split(':');
				var minutes = parsedReminderTimeUtc[1];
				var hourUtc = parseInt(parsedReminderTimeUtc[0]);

				var localHour = hourUtc - parseInt(hourOffsetFromUtc);
				if(localHour > 23){
					localHour = localHour - 24;
				}
				if(localHour < 0){
					localHour = localHour + 24;
				}
				return moment().hours(localHour).minutes(minutes);
			}
			
        };

		return reminderService;
	});