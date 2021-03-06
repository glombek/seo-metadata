module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);
  require('grunt-karma')(grunt);

  //cant load this with require
  grunt.loadNpmTasks('grunt-contrib-jshint');

  if (grunt.option('target') && !grunt.file.isDir(grunt.option('target'))) {
    grunt.fail.warn('The --target option specified is not a valid directory');
  }
    
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    dest: grunt.option('target') || 'dist',
    basePath: 'App_Plugins/<%= pkg.name %>',

    concat: {
      dist: {
        src: [
          'app/scripts/filters/ellipsisLimit.filter.js',
          'app/scripts/directives/maxlen.directive.js',
          'app/scripts/controllers/metadata.controller.js'
        ],
        dest: '<%= dest %>/<%= basePath %>/js/epiphany.seo.metadata.js',
        nonull: true
      }
    },

    sass: {
      dist: {
        options: {
          paths: ['app/styles'],
        },
        files: {
          '<%= dest %>/<%= basePath %>/css/epiphany.seo.metadata.css': 'app/styles/epiphany.seo.metadata.scss',
        }
      }
    },

    watch: {
      options: {
        atBegin: true
      },

      less: {
        files: ['app/styles/**/*.less'],
        tasks: ['less:dist']
      },

      js: {
        files: ['app/scripts/**/*.js'],
        tasks: ['concat:dist']
      },

      testControllers: {
        files: ['app/scripts/**/*.controller.js', 'test/specs/**/*.spec.js'],
        tasks: ['jshint', 'test']
      },

      html: {
        files: ['app/views/**/*.html'],
        tasks: ['copy:views']
      },

      config: {
        files: ['config/package.manifest'],
        tasks: ['copy:config']
      }
    },

    copy: {
      config: {
        src: 'config/package.manifest',
        dest: '<%= dest %>/<%= basePath %>/package.manifest',
      },

      views: {
        expand: true,
        cwd: 'app/views/',
        src: '**',
        dest: '<%= dest %>/<%= basePath %>/views/'
      },

      nuget: {
        files: [
          {
            cwd: '<%= dest %>',
            src: ['**/*', '!bin', '!bin/*'],
            dest: 'tmp/nuget/content',
            expand: true
          },
          {
            cwd: '<%= dest %>/bin',
            src: ['*.dll'],
            dest: 'tmp/nuget/lib/net40',
            expand: true
          }
        ]
      },

      umbraco: {
        expand: true,
        cwd: '<%= dest %>/',
        src: '**',
        dest: 'tmp/umbraco/'
      },

      testAssets: {
        expand: true,
        cwd: '<%= dest %>',
        src: ['js/umbraco.*.js', 'lib/**/*.js'],
        dest: 'test/assets/'
      },

      dll: {
        cwd: 'app/Epiphany.SeoMetadata/bin/Release/',
        src: 'Epiphany.SeoMetadata.dll',
        dest: '<%= dest %>/bin/',
        expand: true
      },
    },

    template: {
      nuspec: {
        options: {
          data: {
            name:        '<%= pkg.name %>',
            version:     '<%= pkg.version %>',
            author:      '<%= pkg.author.name %>',
            description: '<%= pkg.description %>'
          }
        },
        files: {
          'tmp/nuget/<%= pkg.name %>.nuspec': 'config/package.nuspec'
        }
      }
    },

    mkdir: {
      pkg: {
        options: {
          create: ['pkg/nuget', 'pkg/umbraco']
        },
      },
    },

    nugetpack: {
      dist: {
        src: 'tmp/nuget/<%= pkg.name %>.nuspec',
        dest: 'pkg/nuget/'
      }
    },

    umbracoPackage: {
    dist: {
      src: 'tmp/umbraco',        // Path to a folder containing the files to be packaged
      dest: 'pkg/umbraco',        // Path to a folder to create the package file
      options: {
        name:        '<%= pkg.name %>',
        version:     '<%= pkg.version %>',
        url:         '<%= pkg.repository.url %>',
        license:     '<%= pkg.license %>',
        licenseUrl:  '<%= pkg.licenseUrl %>',
        author:      '<%= pkg.author.name %>',
        authorUrl:   '<%= pkg.author.url %>',
        manifest:    'config/package.xml',
        readme:      'README.md',
        sourceDir:   'tmp/umbraco',
        outputDir:   'pkg/umbraco',
      }
    }
  },

    clean: {
      tmp: 'tmp',
      dist: 'dist',
      test: 'test/assets'
    },

    karma: {
      unit: {
        configFile: 'test/karma.conf.js'
      }
    },

    jshint: {
      dev: {
        files: {
          src: ['app/scripts/**/*.js']
        },
        options: {
          curly: true,
          eqeqeq: true,
          immed: true,
          latedef: true,
          newcap: true,
          noarg: true,
          sub: true,
          boss: true,
          eqnull: true,
          //NOTE: we need to use eval sometimes so ignore it
          evil: true,
          //NOTE: we need to check for strings such as "javascript:" so don't throw errors regarding those
          scripturl: true,
          //NOTE: we ignore tabs vs spaces because enforcing that causes lots of errors depending on the text editor being used
          smarttabs: true,
          globals: {}
        }
      }
    },

    assemblyinfo: {
      options: {
        files: ['app/Epiphany.SeoMetadata/Epiphany.SeoMetadata.csproj'],
        filename: 'AssemblyInfo.cs',
        info: {
          version: '<%= (pkg.version.indexOf("-") > 0 ? pkg.version.substring(0, pkgMeta.version.indexOf("-")) : pkg.version) %>', 
          fileVersion: '<%= pkg.version %>'
        }
      }
    },

    msbuild: {
      options: {
        stdout: true,
        verbosity: 'quiet',
        maxCpuCount: 4,
      version: 4.0,
        buildParameters: {
          WarningLevel: 2,
          NoWarn: 1607
        }
      },
      dist: {
        src: ['app/Epiphany.SeoMetadata/Epiphany.SeoMetadata.csproj'],
        options: {
          projectConfiguration: 'Release',
          targets: ['Clean', 'Rebuild'],
        }
      }
    },

    /*
      See https://github.com/vojtajina/grunt-bump

      For bumping a version, best to do the following
      grunt bump-only:minor
      grunt assemblyinfo
      grunt bump-commit
    */

    bump: {
      options: {
        files: ['package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json', 'app/Epiphany.SeoMetadata/Properties/AssemblyInfo.cs'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false,
        prereleaseName: 'pre',
        regExp: false
      }
    }

  });

  grunt.registerTask('default', ['jshint', 'concat', 'sass', 'assemblyinfo', 'msbuild', 'copy:config', 'copy:views', 'copy:dll']);
  grunt.registerTask('nuget', ['clean', 'default', 'copy:nuget', 'template:nuspec', 'mkdir:pkg', 'nugetpack']);
  grunt.registerTask('package', ['clean', 'default', 'copy:umbraco', 'mkdir:pkg', 'umbracoPackage']);
  
  grunt.registerTask('test', 'Clean, copy test assets, test', function () {
    var assetsDir = grunt.config.get('dest');
    //copies over umbraco assets from --target, this must point at the /umbraco/ directory
    if (assetsDir !== 'dist') {
      grunt.task.run(['clean:test', 'copy:testAssets', 'karma']);
    } else if (grunt.file.isDir('test/assets/js/')) {
      grunt.log.oklns('Test assets found, running tests');
      grunt.task.run(['karma']);
    } else {
      grunt.log.errorlns('Tests assets not found, skipping tests');
    }
  });
};
