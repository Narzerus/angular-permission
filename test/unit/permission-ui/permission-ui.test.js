describe('permission.ui', function () {
  'use strict';
  describe('module', function () {

    var $rootScope;
    var $state;
    var $stateProvider;
    var PermPermissionStore;
    var PermTransitionEvents;
    var PermTransitionProperties;
    var PermStateAuthorization;

    beforeEach(function () {
      module('ui.router', function ($injector) {
        $stateProvider = $injector.get('$stateProvider');
      });

      module('permission.ui');

      inject(function ($injector) {
        $state = $injector.get('$state');
        $rootScope = $injector.get('$rootScope');
        PermPermissionStore = $injector.get('PermPermissionStore');
        PermTransitionEvents = $injector.get('PermTransitionEvents');
        PermTransitionProperties = $injector.get('PermTransitionProperties');
        PermStateAuthorization = $injector.get('PermStateAuthorization');
      });
    });

    // Initialize permissions
    beforeEach(function () {
      PermPermissionStore.definePermission('accepted', function () {
        return true;
      });

      PermPermissionStore.definePermission('denied', function () {
        return false;
      });
    });

    // Set default states and go home
    beforeEach(function () {
      $stateProvider
        .state('home', {})
        .state('accepted', {
          data: {
            permissions: {
              only: ['accepted']
            }
          }
        })
        .state('denied', {
          data: {
            permissions: {
              only: ['denied'],
              redirectTo: 'redirected'
            }
          }
        })
        .state('redirected', {});

      $state.go('home');
      $rootScope.$digest();
    });


    describe('method: config', function () {
      it('should decorate $state object', function () {
        // GIVEN
        // WHEN
        // THEN
        expect($state.current.$$permissionState).toBeDefined();
      });
    });

    describe('method: run', function () {
      describe('event: $stateChangeStart', function () {
        it('should set transitionProperties when authorization is not finished', function () {
          // GIVEN
          // WHEN
          $state.go('accepted');
          $rootScope.$digest();

          // THEN
          expect(PermTransitionProperties.toState).toBeDefined();
          expect(PermTransitionProperties.toParams).toBeDefined();
          expect(PermTransitionProperties.fromState).toBeDefined();
          expect(PermTransitionProperties.fromParams).toBeDefined();
          expect(PermTransitionProperties.options).toBeDefined();
        });

        it('should not set $$isAuthorizationFinished flag when authorization is not finished', function () {
          // GIVEN
          $rootScope.$on('$stateChangePermissionStart', function (event) {
            event.preventDefault();
          });

          // WHEN
          $state.go('accepted');
          $rootScope.$digest();

          // THEN
          expect(PermTransitionProperties.toState.$$isAuthorizationFinished).toBeFalsy();
        });

        it('should not start authorizing when $stateChangePermissionStart was prevented', function () {
          // GIVEN
          $rootScope.$on('$stateChangePermissionStart', function (event) {
            event.preventDefault();
          });

          spyOn(PermTransitionEvents, 'broadcastPermissionStartEvent');

          // WHEN
          $state.go('accepted');
          $rootScope.$digest();

          // THEN
          expect($state.current.name).toBe('accepted');

          expect(PermTransitionEvents.broadcastPermissionStartEvent).not.toHaveBeenCalled();
        });

        it('should handle unauthorized state access', function () {
          // GIVEN
          spyOn(PermTransitionEvents, 'broadcastPermissionDeniedEvent');
          spyOn(PermStateAuthorization, 'authorizeByPermissionMap').and.callThrough();

          // WHEN
          $state.go('denied');
          $rootScope.$digest();

          // THEN
          expect($state.current.name).toBe('redirected');
          expect(PermStateAuthorization.authorizeByPermissionMap).toHaveBeenCalled();
          expect(PermTransitionEvents.broadcastPermissionDeniedEvent).toHaveBeenCalled();
        });

        it('should handle authorized state access', function () {
          // GIVEN
          spyOn(PermTransitionEvents, 'broadcastPermissionAcceptedEvent');
          spyOn(PermStateAuthorization, 'authorizeByPermissionMap').and.callThrough();

          // WHEN
          $state.go('accepted');
          $rootScope.$digest();

          // THEN
          expect($state.current.name).toBe('accepted');
          expect(PermStateAuthorization.authorizeByPermissionMap).toHaveBeenCalled();
          expect(PermTransitionEvents.broadcastPermissionAcceptedEvent).toHaveBeenCalled();
        });

        it('should honor params and options passed to "transitionTo" or "go" function', function () {
          // GIVEN
          spyOn($state, '$$transitionTo').and.callThrough();

          $stateProvider
            .state('acceptedWithParamsAndOptions', {
              params: {
                param: undefined
              },
              data: {
                permissions: {
                  only: ['accepted']
                }
              }
            });

          // WHEN
          $state.go('acceptedWithParamsAndOptions', {param: 'param'}, {relative: true, location: false});
          $rootScope.$apply();

          // THEN
          expect($state.$$transitionTo).toHaveBeenCalledWith('acceptedWithParamsAndOptions', {param: 'param'}, {
            location: false, inherit: true, relative: true, notify: true, reload: false, $retry: false
          });
        });
      });
    });
  });
});
