// backend/src/helpers/handlebarsHelpers.js
const handlebars = require('handlebars');

// Register custom helpers for email templates
handlebars.registerHelper('formatDate', function(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

handlebars.registerHelper('formatTime', function(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
});

handlebars.registerHelper('formatDateTime', function(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
});

handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

handlebars.registerHelper('ne', function(a, b) {
  return a !== b;
});

handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});

handlebars.registerHelper('and', function(a, b) {
  return a && b;
});

handlebars.registerHelper('or', function(a, b) {
  return a || b;
});

module.exports = handlebars;