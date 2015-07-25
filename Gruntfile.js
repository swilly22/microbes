'use strict';

var gruntConfig = {
    connect: {
        dev: {
            options: {
                port: 9000,
                base: 'dist'
            }
        }
    },
    browserify: {
        dist: {
            files: {
                'dist/bundle.js': ['index.js']
            }
        }
    }
};

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig(gruntConfig);

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('default', ['browserify', 'connect:dev:keepalive']);    
};