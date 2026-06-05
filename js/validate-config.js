// Sanity-checks your AUTH_CONFIG so paste mistakes surface as a friendly
// message instead of a confusing OAuth error. Loaded both in the browser
// (exposes window.validateSocialLoginConfig) and in Node tests.
(function () {
  'use strict';

  function isPlaceholder(value) {
    return (
      typeof value === 'string' &&
      (value.includes('XXXX') ||
        value.includes('xxxx') ||
        value.includes('your-prefix'))
    );
  }

  function validateConfig(config) {
    if (!config || typeof config !== 'object') {
      return [
        'AUTH_CONFIG is missing — did you copy config.example.js to config.js and fill it in?',
      ];
    }

    const errors = [];
    const regionRe = /^[a-z]{2}-[a-z]+-\d$/;
    const poolRe = /^[a-z]{2}-[a-z]+-\d_[A-Za-z0-9]+$/;

    if (!config.region || isPlaceholder(config.region)) {
      errors.push('region is missing or still a placeholder.');
    } else if (!regionRe.test(config.region)) {
      errors.push(`region "${config.region}" doesn't look like an AWS region (e.g. us-east-1).`);
    }

    if (!config.userPoolId || isPlaceholder(config.userPoolId)) {
      errors.push('userPoolId is missing or still a placeholder.');
    } else if (!poolRe.test(config.userPoolId)) {
      errors.push(`userPoolId "${config.userPoolId}" doesn't look right (expected like us-east-1_AbC123).`);
    } else if (config.region && !config.userPoolId.startsWith(config.region + '_')) {
      errors.push(`userPoolId region prefix does not match region "${config.region}".`);
    }

    if (!config.clientId || isPlaceholder(config.clientId)) {
      errors.push('clientId is missing or still a placeholder.');
    }

    if (!config.domain || isPlaceholder(config.domain)) {
      errors.push('domain is missing or still a placeholder.');
    } else if (!config.domain.endsWith('amazoncognito.com')) {
      errors.push(`domain "${config.domain}" should end with .amazoncognito.com (the free Cognito Hosted-UI domain).`);
    }

    return errors;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateConfig };
  }
  if (typeof window !== 'undefined') {
    window.validateSocialLoginConfig = validateConfig;
  }
})();
