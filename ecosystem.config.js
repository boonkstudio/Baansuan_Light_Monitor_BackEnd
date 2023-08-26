module.exports = {
  apps: [{
    name: 'BSLMB',
    script: 'bin/www',
    instances: 1,
    exec_mode: 'cluster',
  }],
};
