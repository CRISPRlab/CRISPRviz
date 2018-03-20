// Configure loading modules from the lib directory,
// except for 'app' dirs, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'lib',
    paths: {
        'app': '../app',
        'jquery': 'jquery.min.1.11.1',
        'bootstrap': 'bootstrap.min',  
        'Sortable': 'Sortable.min',
        'FileSaver': 'FileSaver.min', 
        'underscore': 'underscore-min'
    }, 
    shim : {
    	//dependency management
    	'bootstrap': ['jquery'] 
  	}
});

requirejs(['app/main']);

