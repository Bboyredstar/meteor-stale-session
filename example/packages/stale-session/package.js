Package.describe({
  name: 'bboyredstar:stale-session',
  version: '0.0.5',
  summary: 'Activity detection for the session timeout',
  git: 'https://github.com/Bboyredstar/meteor-stale-session',
  documentation: './README.md',
});

Npm.depends({
  'simpl-schema': '3.4.6',
  '@types/meteor': '2.9.8',
  '@types/jquery': '3.5.33',
  'lodash.throttle': '4.1.1',
  jquery: '3.7.1',
  '@types/lodash.throttle': '4.1.9',
});

Package.onUse(function (api) {
  api.versionsFrom(['2.9.0', '3.3.2']);
  api.use(['ecmascript', 'typescript@5.6.6', 'zodern:types@1.0.13']);
  api.mainModule('index.ts');
});
